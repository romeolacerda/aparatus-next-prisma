import Image from "next/image";
import banner from '../public/banner.png';
import BookingItem from "./_components/booking-item";
import Header from "./_components/header";
import SearchInput from "./_components/search-input";

export default function Home() {
  return (
    <main>
      <Header />
      <div className="space-y-4 px-5">
        <SearchInput />
        <Image 
        src={banner} 
        alt="Agende aqui!"
        sizes="100w" 
        className="h-auto w-full" />
        <h2 className="text-xs text-foregroun font-semibold uppercase">Agendamentos</h2>
        <BookingItem 
          serviceName="Corte de cabelo"
          barbershopName="Barbearia do matuto"
          barbershopImage="https://utfs.io/f/c97a2dc9-cf62-468b-a851-bfd2bdde775f-16p.png"
          date={new Date()}
        />
      </div>
    </main>
  )
}
