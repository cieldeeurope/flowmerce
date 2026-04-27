import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "플로우머스 대표 이미지";
export const size = {
   width: 1200,
   height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
   return new ImageResponse(
      (
         <div
            style={{
               width: "100%",
               height: "100%",
               display: "flex",
               flexDirection: "column",
               justifyContent: "space-between",
               padding: "56px 64px",
               background:
                  "linear-gradient(135deg, #ecfdf5 0%, #ffffff 52%, #e0f2fe 100%)",
               color: "#0f172a",
            }}
         >
            <div
               style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
               }}
            >
               <div
                  style={{
                     width: 18,
                     height: 18,
                     borderRadius: 9999,
                     background: "#10b981",
                  }}
               />
               <div
                  style={{
                     fontSize: 28,
                     fontWeight: 700,
                     letterSpacing: "-0.02em",
                  }}
               >
                  FLOWMERCE
               </div>
            </div>

            <div
               style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
               }}
            >
               <div
                  style={{
                     fontSize: 78,
                     fontWeight: 800,
                     lineHeight: 1.05,
                     letterSpacing: "-0.04em",
                  }}
               >
                  쇼핑몰 자동화
                  <br />
                  솔루션 플로우머스
               </div>
               <div
                  style={{
                     fontSize: 28,
                     color: "#475569",
                     lineHeight: 1.5,
                  }}
               >
                  명품 구매대행 자동화, SEO 상품 최적화, 재고관리 자동화,
                  플랫폼 운영 흐름을 한 번에 지원합니다.
               </div>
            </div>

            <div
               style={{
                  display: "flex",
                  gap: 16,
               }}
            >
               {["SEO", "Inventory", "Luxury", "Automation"].map((item) => (
                  <div
                     key={item}
                     style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "12px 20px",
                        borderRadius: 9999,
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        background: "rgba(255,255,255,0.92)",
                        fontSize: 22,
                        fontWeight: 600,
                        color: "#0f172a",
                     }}
                  >
                     {item}
                  </div>
               ))}
            </div>
         </div>
      ),
      size,
   );
}
