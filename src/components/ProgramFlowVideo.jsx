"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function findCue(cues, currentTime) {
   return (
      cues.find((cue) => currentTime >= cue.start && currentTime < cue.end) ||
      null
   );
}

export default function ProgramFlowVideo({ src, poster, cues = [] }) {
   const wrapperRef = useRef(null);
   const videoRef = useRef(null);
   const [activeCue, setActiveCue] = useState(() => findCue(cues, 0));
   const [hasStarted, setHasStarted] = useState(false);
   const [isFullscreen, setIsFullscreen] = useState(false);

   useEffect(() => {
      const handleFullscreenChange = () => {
         const fullscreenElement =
            document.fullscreenElement || document.webkitFullscreenElement;
         setIsFullscreen(fullscreenElement === wrapperRef.current);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);

      return () => {
         document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
   }, []);

   const subtitleStyle = useMemo(
      () => ({
         fontFamily:
            '"Pretendard Variable", "Pretendard", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
         textShadow:
            "0 1px 2px rgba(0,0,0,0.95), 1px 1px 0 rgba(0,0,0,0.95), -1px 1px 0 rgba(0,0,0,0.95), 1px -1px 0 rgba(0,0,0,0.95), -1px -1px 0 rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.45)",
      }),
      [],
   );

   const syncCue = (time) => {
      setActiveCue(findCue(cues, time));
   };

   const handlePlayClick = async () => {
      if (!videoRef.current) {
         return;
      }

      setHasStarted(true);

      try {
         await videoRef.current.play();
      } catch {
         // Let the native controls handle any blocked playback.
      }
   };

   const handleToggleFullscreen = async () => {
      if (!wrapperRef.current) {
         return;
      }

      try {
         const fullscreenElement =
            document.fullscreenElement || document.webkitFullscreenElement;

         if (fullscreenElement === wrapperRef.current) {
            if (document.exitFullscreen) {
               await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
               document.webkitExitFullscreen();
            }
            return;
         }

         if (wrapperRef.current.requestFullscreen) {
            await wrapperRef.current.requestFullscreen();
         } else if (wrapperRef.current.webkitRequestFullscreen) {
            wrapperRef.current.webkitRequestFullscreen();
         }
      } catch {
         // Ignore fullscreen errors and keep native playback available.
      }
   };

   return (
      <div
         ref={wrapperRef}
         className="group relative overflow-hidden rounded-[24px] bg-black fullscreen:flex fullscreen:items-center fullscreen:justify-center fullscreen:rounded-none fullscreen:bg-black"
      >
         <video
            ref={videoRef}
            controls
            controlsList="nofullscreen"
            playsInline
            preload="metadata"
            poster={poster}
            className="block aspect-video w-full bg-black fullscreen:h-full fullscreen:w-full fullscreen:max-h-screen fullscreen:object-contain"
            onPlay={() => setHasStarted(true)}
            onTimeUpdate={(event) => syncCue(event.currentTarget.currentTime)}
            onSeeked={(event) => syncCue(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) =>
               syncCue(event.currentTarget.currentTime || 0)
            }
         >
            <source src={src} type="video/mp4" />
         </video>

         <button
            type="button"
            onClick={handleToggleFullscreen}
            className="absolute right-3 top-3 z-20 inline-flex items-center rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70"
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면 보기"}
         >
            {isFullscreen ? "전체화면 종료" : "전체화면 보기"}
         </button>

         {!hasStarted ? (
            <button
               type="button"
               onClick={handlePlayClick}
               className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/28"
               aria-label="실제 사용 영상 재생"
            >
               <span className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-black/55 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-black">
                     재생
                  </span>
                  실제 사용 영상 보기
               </span>
            </button>
         ) : null}

         {activeCue ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 px-4 sm:px-6 md:bottom-16 fullscreen:bottom-20">
               <div className="mx-auto max-w-4xl rounded-2xl bg-black/38 px-4 py-3 text-center text-sm font-medium leading-6 text-white backdrop-blur-[2px] sm:text-base sm:leading-7 md:px-5 md:py-3.5 md:text-lg">
                  <p style={subtitleStyle}>
                     {activeCue.lines.map((line) => (
                        <span key={line} className="block">
                           {line}
                        </span>
                     ))}
                  </p>
               </div>
            </div>
         ) : null}
      </div>
   );
}
