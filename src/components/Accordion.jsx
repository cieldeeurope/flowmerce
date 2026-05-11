"use client";

import { Disclosure, Transition } from "@headlessui/react";
import clsx from "clsx";
import { ArrowDownIcon } from "./icons/ArrowDownIcon";

export default function Accordion({ title, children, className }) {
   return (
      <Disclosure>
         <Disclosure.Button
            className={clsx(
               "flex w-full items-center justify-between gap-x-7 rounded-lg border border-zinc-200 bg-white p-6 text-left font-medium duration-150 hover:border-amber-300 hover:bg-[#fbf7ef] sm:text-lg",
               className,
            )}
         >
            {title}
            <ArrowDownIcon className="h-5 w-5 shrink-0 transition-transform ui-open:rotate-180 ui-open:transform" />
         </Disclosure.Button>
         <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
         >
            <Disclosure.Panel
               className="rounded-lg border border-zinc-200 bg-[#fbf7ef] p-5 sm:p-7"
               static
            >
               {children}
            </Disclosure.Panel>
         </Transition>
      </Disclosure>
   );
}
