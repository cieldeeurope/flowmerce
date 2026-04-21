export const metadata = {
   title: "Reset Password – Amiso",
   description: "Transform your business with our SaaS platform",
};

export default function ResetPage() {
   return (
      <div className="mt-7 flex w-full max-w-sm flex-col">
         <h1 className="text-2xl font-medium">Reset your password</h1>
         <p className="mt-2 text-zinc-600">
            Enter your email and we&apos;ll send you a link to reset your
            password.
         </p>

         <form action="" className="mt-7 space-y-3.5">
            <div>
               <label
                  htmlFor="email"
                  className="text-sm font-medium text-zinc-600"
               >
                  Email address
               </label>
               <div className="mt-1.5">
                  <input
                     type="email"
                     name="email"
                     id="email"
                     placeholder="Enter your email address"
                     className="block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600"
                     required
                  />
               </div>
            </div>

            <div>
               <button
                  type="submit"
                  className="block w-full rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
               >
                  Reset password
               </button>
            </div>
         </form>
      </div>
   );
}
