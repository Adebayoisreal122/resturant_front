import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600"><WifiOff size={30} /></span>
      <h1 className="mt-5 text-2xl font-bold">No internet connection</h1>
      <p className="mt-2 text-stone-600">We can't reach the kitchen right now. Check your network and try again. Menus you opened before may still be available.</p>
      <Link href="/" className="mt-6 rounded-full bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700">Try again</Link>
    </div>
  );
}
