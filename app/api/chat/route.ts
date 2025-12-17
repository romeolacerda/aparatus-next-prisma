import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import z from "zod";
import { prisma } from "@/lib/prisma";
import { getDateAvailableTimeSlots } from "@/app/_actions/get-date-available-time-slots";
import { createBookingCheckoutSession } from "@/app/_actions/create-booking-checkout-session";

const recentCheckouts = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentCheckouts.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      recentCheckouts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const POST = async (request: Request) => {
  const { messages } = await request.json();
  const result = streamText({
    model: google("gemini-2.0-flash"),
    stopWhen: stepCountIs(10),
    system: `Você é o Agenda.ai, um assistente virtual de agendamento de barbearias.

    DATA ATUAL: Hoje é ${new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })} (${new Date().toISOString().split("T")[0]})

    Seu objetivo é ajudar os usuários a:
    - Encontrar barbearias (por nome ou todas disponíveis)
    - Verificar disponibilidade de horários para barbearias específicas
    - Fornecer informações sobre serviços e preços

    Fluxo de atendimento:

    CENÁRIO 1 - Usuário menciona data/horário na primeira mensagem (ex: "quero um corte pra hoje", "preciso cortar o cabelo amanhã", "quero marcar para sexta"):
    1. Use a ferramenta searchBarbershops para buscar barbearias
    2. IMEDIATAMENTE após receber as barbearias, use a ferramenta getAvailableTimeSlotsForBarbershop para CADA barbearia retornada, passando a data mencionada pelo usuário
    3. Apresente APENAS as barbearias que têm horários disponíveis, mostrando:
       - Nome da barbearia
       - Endereço
       - Serviços oferecidos com preços
       - Alguns horários disponíveis (4-5 opções espaçadas)
    4. Quando o usuário escolher, forneça o resumo final

    CENÁRIO 2 - Usuário não menciona data/horário inicialmente:
    1. Use a ferramenta searchBarbershops para buscar barbearias
    2. Apresente as barbearias encontradas com:
       - Nome da barbearia
       - Endereço
       - Serviços oferecidos com preços
    3. Quando o usuário demonstrar interesse em uma barbearia específica ou mencionar uma data, pergunte a data desejada (se ainda não foi informada)
    4. Use a ferramenta getAvailableTimeSlotsForBarbershop passando o barbershopId e a data
    5. Apresente os horários disponíveis (liste alguns horários, não todos - sugira 4-5 opções espaçadas)

    Resumo final (quando o usuário escolher):
    - Nome da barbearia
    - Endereço
    - Serviço escolhido
    - Data e horário escolhido
    - Preço

    IMPORTANTE SOBRE IDs:
    - Quando você buscar as barbearias e serviços, você receberá o campo "id" de cada serviço
    - GUARDE MENTALMENTE esse ID do serviço que o usuário escolheu
    - Exemplo: Se o usuário escolher "Corte de Cabelo" da barbearia "Vintage Barber", você deve lembrar qual era o "id" desse serviço específico que foi retornado pela ferramenta searchBarbershops, lembre-se de não compartilhao com o usuário

    Criação da reserva:
    - Após o usuário confirmar explicitamente a escolha (ex: "confirmo", "pode agendar", "quero esse horário"), use a ferramenta createCheckoutSession
    - IMPORTANTE: Use a ferramenta createCheckoutSession APENAS UMA VEZ por agendamento confirmado
    - Se você já criou um checkout session nesta conversa, NÃO crie outro
    - Parâmetros necessários:
      * serviceId: Use o ID (campo "id") do serviço que foi retornado pela ferramenta searchBarbershops quando o usuário escolheu o serviço. É um UUID, não o nome do serviço!
      * date: Data e horário no formato ISO (YYYY-MM-DDTHH:mm:ss) - exemplo: "2025-11-05T10:00:00"
    - Se a criação for bem-sucedida (success: true, url: "..."), informe ao usuário:
      * "Perfeito! Estou redirecionando você para o pagamento. Aguarde um momento..."
    - Se houver erro (success: false), explique o erro ao usuário:
      * Se o erro for "Unauthorized", informe que é necessário fazer login para criar uma reserva
      * Se o erro for "Duplicate booking", informe que já foi criado um agendamento para este horário
      * Para outros erros, informe que houve um problema e peça para tentar novamente

    Importante:
    - NUNCA mostre informações técnicas ao usuário (barbershopId, serviceId, formatos ISO de data, URLs, etc.)
    - Seja sempre educado, prestativo e use uma linguagem informal e amigável
    - Não liste TODOS os horários disponíveis, sugira apenas 4-5 opções espaçadas ao longo do dia
    - Se não houver horários disponíveis, sugira uma data alternativa
    - Quando o usuário mencionar "hoje", "amanhã", "depois de amanhã" ou dias da semana, calcule a data correta automaticamente`,
    messages: convertToModelMessages(messages),
    tools: {
      searchBarbershops: tool({
        description:
          "Pesquisa barbearias pelo nome. Se nenhum nome é fornecido, retorna todas as barbearias.",
        inputSchema: z.object({
          name: z.string().optional().describe("Nome opcional da barbearia"),
        }),
        execute: async ({ name }) => {
          if (!name?.trim()) {
            const barbershops = await prisma.barbershop.findMany({
              include: {
                services: true,
              },
            });
            return barbershops.map((barbershop) => ({
              barbershopId: barbershop.id,
              name: barbershop.name,
              address: barbershop.address,
              services: barbershop.services.map((service) => ({
                id: service.id,
                name: service.name,
                price: service.priceInCents / 100,
              })),
            }));
          }
          const barbershops = await prisma.barbershop.findMany({
            where: {
              name: {
                contains: name,
                mode: "insensitive",
              },
            },
            include: {
              services: true,
            },
          });
          return barbershops.map((barbershop) => ({
            barbershopId: barbershop.id,
            name: barbershop.name,
            address: barbershop.address,
            services: barbershop.services.map((service) => ({
              id: service.id,
              name: service.name,
              price: service.priceInCents / 100,
            })),
          }));
        },
      }),
      getAvailableTimeSlotsForBarbershop: tool({
        description:
          "Obtém os horários disponíveis para uma barbearia em uma data específica.",
        inputSchema: z.object({
          barbershopId: z.string().describe("ID da barbearia"),
          date: z
            .string()
            .describe(
              "Data no formato YYYY-MM-DD para a qual deseja obter os horários disponíveis",
            ),
        }),
        execute: async ({ barbershopId, date }) => {
          const parsedDate = new Date(date);
          const result = await getDateAvailableTimeSlots({
            barbershopId,
            date: parsedDate,
          });
          if (result.serverError || result.validationErrors) {
            return {
              error:
                result.validationErrors?._errors?.[0] ||
                "Erro ao buscar horários disponíveis",
            };
          }
          return {
            barbershopId,
            date,
            availableTimeSlots: result.data,
          };
        },
      }),
      createCheckoutSession: tool({
        description:
          "Cria uma sessão de checkout do Stripe para o agendamento de um serviço em uma data específica. ATENÇÃO: Use esta ferramenta APENAS UMA VEZ por confirmação do usuário.",
        inputSchema: z.object({
          serviceId: z.string().describe("ID do serviço"),
          date: z
            .string()
            .describe("Data em ISO String para a qual deseja agendar (formato: YYYY-MM-DDTHH:mm:ss)"),
        }),
        execute: async ({ serviceId, date }) => {

          try {
            const bookingKey = `${serviceId}-${date}`;

            const lastCheckout = recentCheckouts.get(bookingKey);
            if (lastCheckout && Date.now() - lastCheckout < 10 * 60 * 1000) {
              return {
                success: false,
                error: "Duplicate booking",
              };
            }

            const parsedDate = new Date(date);

            if (isNaN(parsedDate.getTime())) {
              return {
                success: false,
                error: "Data inválida",
              };
            }

            const result = await createBookingCheckoutSession({
              serviceId,
              date: parsedDate,
            });

            if (result?.serverError) {
              console.error("❌ Server error:", result.serverError);
              return {
                success: false,
                error: result.serverError,
              };
            }

            if (result?.validationErrors) {
              const errorMessage = result.validationErrors._errors?.[0] ||
                "Erro de validação";

              if (errorMessage === "Unauthorized") {
                return {
                  success: false,
                  error: "Unauthorized",
                };
              }

              return {
                success: false,
                error: errorMessage,
              };
            }

            if (result?.data) {
              recentCheckouts.set(bookingKey, Date.now());

              return {
                success: true,
                url: result.data.url,
                checkoutSessionId: result.data.id,
              };
            }

            return {
              success: false,
              error: "Resposta inesperada da API",
            };

          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Erro desconhecido",
            };
          }
        },
      }),
    },
  });
  
  return result.toUIMessageStreamResponse();
};