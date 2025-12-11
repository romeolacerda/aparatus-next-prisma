import Image from "next/image"
import Link from "next/link"
import { Barbershop } from "@/generated/prisma/client"

interface BarbershopItemProps {
    barbershop: Barbershop
}

const BarbershopItem = ({ barbershop }: BarbershopItemProps) => {
    return (
        <Link href={`/barbershops/${barbershop.id}`} className="relative min-h-[200px] min-w-[290px] rounded-xl" >
            <div className="to-transparent h-full w-full absolute top-0 left-0 bg-linear-to-t from-black z-10 rounded-lg" />
            <Image
                src={barbershop.imageUrl}
                alt={barbershop.name}
                fill
                className="rounded-xl object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
                <h3 className="text-background text-lg font-bold">{barbershop.name}</h3>
                <p className="text-background text-xs">{barbershop.address}</p>
            </div>
        </Link>)
}

export default BarbershopItem