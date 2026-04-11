import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MainPage() {
    return (
        <div>
            <Link href="/dashboard"><Button>Создать заказ</Button></Link>
              <Link href="/pro"><Button>Для исполнителя</Button></Link>
        </div>
    );
}