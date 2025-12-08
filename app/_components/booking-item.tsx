import { AvatarImage } from "@radix-ui/react-avatar"
import { Avatar } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"

interface BookingItemProps {
    serviceName: string
    barbershopName: string
    barbershopImage: string
    date: Date
}

const BookingItem = ({ barbershopImage, barbershopName, date, serviceName }: BookingItemProps) => {
    return (
        <Card className="flex items-center flex-row justify-between w-full min-w-full p-0">
            <div className="flex flex-col gap-4 flex-1 p-4">
                <Badge>Confirmado</Badge>

                <div className="flex flex-col gap-2">
                    <p className="font-bold">{serviceName}</p>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={barbershopImage} />
                        </Avatar>
                        <p className="text-muted-foreground text-sm">{barbershopName}</p>
                    </div>
                </div>
            </div>

            <div className="flex h-full min-h-full flex-col items-center justify-center border-l p-4 py-3">
                <p className="text-xs capitalize">
                    {date.toLocaleDateString('pt-BR', { month: "long" })}
                </p>
                <p>{date.toLocaleDateString('pt-BR', { day: "2-digit" })}</p>
                <p className="text-sx capitalize">
                    {date.toLocaleTimeString('pt-BR', {
                        hour: "2-digit", 
                        minute: "2-digit"
                    })}
                </p>
            </div>
        </Card>
    )
}

export default BookingItem
