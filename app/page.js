import { redirect } from "next/navigation";

/** Index route → send users straight to the flashcards section. */
export default function Home() {
  redirect("/karten");
}
