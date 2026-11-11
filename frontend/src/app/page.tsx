import { redirect } from "next/navigation";

export default function RootPage() {
  // Always redirect to login from the root
  redirect("/login");
}