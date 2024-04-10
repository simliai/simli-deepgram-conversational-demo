"use client";

import Image from "next/image";
import GitHubButton from "react-github-btn";

export const runtime = "edge";
import { init } from "@fullstory/browser";
import { useEffect } from "react";
import { XIcon } from "./components/icons/XIcon";
import { FacebookIcon } from "./components/icons/FacebookIcon";
import { LinkedInIcon } from "./components/icons/LinkedInIcon";
import Conversation from "./components/Conversation";

export default function Home() {
  // const worker = useRef<Worker>();
  // const [result, setResult] = useState(null);
  // const [ready, setReady] = useState(false);

  useEffect(() => {
    init({ orgId: "5HWAN" });
  }, []);

  // // We use the `useEffect` hook to set up the worker as soon as the `App` component is mounted.
  // useEffect(() => {
  //   if (!worker.current) {
  //     // Create the worker if it does not yet exist.
  //     worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
  //       type: "module",
  //     });
  //   }

  //   // Create a callback function for messages from the worker thread.
  //   const onMessageReceived = (e: {
  //     data: { status: any; output: SetStateAction<null>[] };
  //   }) => {
  //     switch (e.data.status) {
  //       case "initiate":
  //         setReady(false);
  //         break;
  //       case "ready":
  //         setReady(true);
  //         break;
  //       case "complete":
  //         setResult(e.data.output[0]);
  //         break;
  //     }
  //   };

  //   // Attach the callback function as an event listener.
  //   worker.current.addEventListener("message", onMessageReceived);

  //   // Define a cleanup function for when the component is unmounted.
  //   return () =>
  //     worker.current?.removeEventListener("message", onMessageReceived);
  // });

  // const classify = useCallback((text: any) => {
  //   if (worker.current) {
  //     worker.current.postMessage({ text });
  //   }
  // }, []);

  return (
    <>
      <div className="h-full overflow-hidden">
        {/* height 4rem */}
        <div className="bg-gradient-to-b from-black/50 to-black/10 backdrop-blur-[2px] h-[4rem] flex items-center">
          <header className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 flex items-center justify-between">
            <div>
              <a className="flex items-center" href="/">
                <Image
                  className="w-auto h-8 max-w-[12.5rem] sm:max-w-none"
                  src="/deepgram.svg"
                  alt="Deepgram Logo"
                  width={0}
                  height={0}
                  priority
                />
              </a>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="mt-1">
                <GitHubButton
                  href="https://github.com/deepgram-devs/deepgram-conversational-demo"
                  data-color-scheme="no-preference: light; light: light; dark: light;"
                  data-size="large"
                  data-show-count="true"
                  aria-label="Star deepgram-devs/deepgram-conversational-demo on GitHub"
                >
                  Star
                </GitHubButton>
              </span>

              <span className="gradient-shadow bg-gradient-to-r to-[#13EF93]/50 from-[#149AFB]/80 rounded">
                <a
                  href="https://console.deepgram.com/signup?jump=keys"
                  target="_blank"
                  className="hidden text-xs md:inline-block bg-black text-white rounded m-px px-8 py-2 font-semibold"
                >
                  Get an API Key
                </a>
              </span>
            </div>
          </header>
        </div>

        {/* height 100% minus 8rem */}
        {/* <div className="text-black">
          <input
            className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
            type="text"
            placeholder="Enter text here"
            onInput={(e: any) => {
              classify(e.target.value);
            }}
          />

          {ready !== null && (
            <pre className="bg-gray-100 p-2 rounded">
              {!ready || !result
                ? "Loading..."
                : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div> */}

        {/* height 100% minus 8rem */}
        <main className="mx-auto max-w-7xl  px-4 md:px-6 lg:px-8 h-[calc(100%-8rem)]">
          <Conversation />
        </main>

        {/* height 4rem */}
        <div className=" backdrop-blur-[2px] h-[4rem] flex items-center">
          <footer className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 flex items-center justify-center gap-4 md:text-xl font-inter text-[#8a8a8e]">
            <span className="text-base text-[#4e4e52]">share it</span>
            <a
              href="#"
              onClick={(e) => {
                window.open(
                  "https://twitter.com/intent/tweet?text=%F0%9F%94%A5%F0%9F%8E%89%20Check%20out%20this%20awesome%20%23AI%20demo%20by%20%40Deepgram%20and%20%40lukeocodes%0A%0A%20https%3A//aura-tts-demo.deepgram.com",
                  "",
                  "_blank, width=600, height=500, resizable=yes, scrollbars=yes"
                );

                return e.preventDefault();
              }}
              aria-label="share on twitter"
              target="_blank"
            >
              <XIcon className="mb-1" />
            </a>
            <a
              href="#"
              onClick={(e) => {
                window.open(
                  "https://www.linkedin.com/shareArticle?mini=true&url=https%3A//aura-tts-demo.deepgram.com&title=Excellent review on my website reviews",
                  "",
                  "_blank, width=600, height=500, resizable=yes, scrollbars=yes"
                );

                return e.preventDefault();
              }}
              aria-label="share on Linkedin"
            >
              <LinkedInIcon className="mb-1" />
            </a>
            <a
              href="#"
              onClick={(e) => {
                window.open(
                  "https://www.facebook.com/sharer/sharer.php?u=https%3A//aura-tts-demo.deepgram.com",
                  "",
                  "_blank, width=600, height=500, resizable=yes, scrollbars=yes"
                );

                return e.preventDefault();
              }}
              target="_blank"
              aria-label="share on Facebook"
            >
              <FacebookIcon className="mb-1" />
            </a>
            <div className="border-l border-[#4e4e52] w-px h-7">&nbsp;</div>
            <a
              className="text-base font-semibold"
              href="https://deepgram.com/contact-us"
              target="_blank"
            >
              contact us
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}
