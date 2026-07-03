import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Home: enruta según la sesión.
//  · sin sesión → /login
//  · con sesión → /dashboard
export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
