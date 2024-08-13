"use client";

import { useRouter } from "next/navigation";
import {useState} from "react";

export default function Home() {
    const router = useRouter();
    const [username, setUsername] = useState("");
  return (
   <main className={"flex flex-col p-12 w-full min-h-screen"}>
      <input className={"p-1 border border-gray-300 w-full h-[70px] px-2"} placeholder={"enter username"}
             onChange={(e) => setUsername(e.target.value)} />
       <button className={"bg-violet-500 w-full h-[70px] mt-5 text-white"}
               onClick={() => router.push(`/chat?username=${username}`)}>Enter</button>
   </main>
  );
}
