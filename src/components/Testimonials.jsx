import Image from "next/image";
import Container from "./Container";
import avatarImage1 from "@/images/testimonials/avatar-1.jpg";
import avatarImage2 from "@/images/testimonials/avatar-2.jpg";
import avatarImage3 from "@/images/testimonials/avatar-3.jpg";
import avatarImage4 from "@/images/testimonials/avatar-4.jpg";
import avatarImage5 from "@/images/testimonials/avatar-5.jpg";
import avatarImage6 from "@/images/testimonials/avatar-6.jpg";
import avatarImage7 from "@/images/testimonials/avatar-7.jpg";
import avatarImage8 from "@/images/testimonials/avatar-8.jpg";
import avatarImage9 from "@/images/testimonials/avatar-9.jpg";

export default function Testimonials() {
   const testimonials = [
      [
         {
            id: 1,
            text: "Amiso has completely revolutionized the way we manage projects and collaborate as a team. The automation features alone saved us countless hours, and the real-time analytics give us insights we never had before.",
            author: {
               photo: avatarImage1,
               name: "Sarah Johnson",
               role: "CEO, XYZ Innovations",
            },
         },
         {
            id: 2,
            text: "Amiso's automation tools have simplified our workflow and reduced errors. We can focus on strategic tasks, knowing that routine processes are being handled efficiently.",
            author: {
               photo: avatarImage2,
               name: "Jessica White",
               role: "Operations Manager,",
            },
         },
         {
            id: 3,
            text: "Amiso has been a game-changer for our project management. The smart automation and customizable user roles have made our workflow incredibly smooth. It's a must-have tool for any growing business.",
            author: {
               photo: avatarImage3,
               name: "Emily Rodriguez",
               role: "Project Manager, ABC Tech Solutions",
            },
         },
      ],
      [
         {
            id: 4,
            text: "Amiso's customizable dashboards have given us a visual overview of our projects, and the ability to create tailored reports helps us keep stakeholders informed and engaged.",
            author: {
               photo: avatarImage8,
               name: "Alex Patel",
               role: "Project Coordinator",
            },
         },
         {
            id: 5,
            text: "Since implementing Amiso, our team's productivity has skyrocketed. The real-time analytics and reporting have given us valuable insights into our performance, helping us make data-driven decisions.",
            author: {
               photo: avatarImage5,
               name: "Lisa Anderson",
               role: "COO, Innovate Industries",
            },
         },
         {
            id: 6,
            text: "Amiso is a lifesaver for our remote team. The seamless collaboration features have made it easy for us to work together, no matter where we are in the world. Plus, the customer support is top-notch!",
            author: {
               photo: avatarImage6,
               name: "Michael Turner",
               role: "Creative Director",
            },
         },
      ],
      [
         {
            id: 7,
            text: "I can't express how impressed I am with Amiso. As a small business owner, it's essential to stay organized, and Amiso's intuitive interface and collaboration tools have made a significant difference in our efficiency and productivity.",
            author: {
               photo: avatarImage7,
               name: "David Lee",
               role: "Founder, Lee's Marketing Solutions",
            },
         },
         {
            id: 8,
            text: "Switching to Amiso was one of the best decisions we've made. The collaboration features, like real-time messaging and file sharing, have enhanced our team's communication, making us more agile and productive.",
            author: {
               photo: avatarImage4,
               name: "Mark Davis",
               role: "Marketing Director",
            },
         },
         {
            id: 9,
            text: "I've tried many project management tools, but Amiso stands out. It adapts to my needs, whether I'm working solo or collaborating with my team. It's a valuable asset in my daily workflow.",
            author: {
               photo: avatarImage9,
               name: "Maria Sanchez",
               role: "Freelance Developer",
            },
         },
      ],
   ];

   return (
      <section className="pt-16 md:pt-28" id="testimonials">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                  Testimonials
               </span>
               <h2 className="mx-auto max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                  This is why customers love us
               </h2>
            </div>

            <div className="relative mt-10 grid grid-cols-1 gap-7 overflow-hidden md:mt-14 md:max-h-[48rem] md:grid-cols-2 lg:grid-cols-3">
               {testimonials.map((column, columnIndex) => (
                  <div key={columnIndex} className="flex flex-col gap-y-7">
                     {column.map((testimonial, testimonialIndex) => (
                        <div
                           key={`testimonial-${testimonialIndex}`}
                           className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm"
                        >
                           <p className="text-zinc-600">{testimonial.text}</p>

                           <div className="mt-7 flex items-center gap-x-3">
                              <Image
                                 src={testimonial.author.photo}
                                 alt={testimonial.author.name}
                                 width={48}
                                 height={48}
                                 className="rounded-full shadow-sm ring-1 ring-zinc-950/10"
                              />

                              <div className="space-y-0.5">
                                 <p className="font-medium">
                                    {testimonial.author.name}
                                 </p>
                                 <p className="text-sm text-zinc-600">
                                    {testimonial.author.role}
                                 </p>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               ))}
               <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-white"></div>
            </div>
         </Container>
      </section>
   );
}
