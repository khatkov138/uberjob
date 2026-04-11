import { Metadata } from "next";



export async function generateMetadata() {
  

    
    return {
        title: `not found 404`,

    }
}
export default function NotFound() {
    return (
        <main className="my-12 w-full space-y-3 text-center">
            <h1 className="text-3xl font-bold">
                Not Found
            </h1>
            <p>The page you are looking for does not exits.</p>

        </main>
    )
}
