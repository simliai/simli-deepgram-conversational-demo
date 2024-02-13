"use client";

import { ChatBubble, RightBubble } from "./chatbubbles";
import {
  CreateProjectKeyResponse,
  LiveClient,
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  createClient,
} from "@deepgram/sdk";
import {
  blankUserMessage,
  getConversationMessages,
  utteranceText,
} from "../lib/helpers";
import { systemContent } from "../lib/constants";
import { InitialLoad } from "./initialload";
import { isBrowser } from "react-device-detect";
import { useChat } from "ai/react";
import { useQueue } from "@uidotdev/usehooks";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { LLMRequestMetadata, LLMMessage } from "../lib/types";

/**
 * Conversation element that contains the conversational AI app.
 * @returns {JSX.Element}
 */
export default function Conversation() {
  const { messages: gptmessages, append } = useChat({ api: "/api/brain" });

  /**
   * Refs
   */
  const messageMarker = useRef<null | HTMLDivElement>(null);

  /**
   * State
   */
  const [apiKey, setApiKey] = useState<CreateProjectKeyResponse | null>();
  const [connection, setConnection] = useState<LiveClient | null>();
  const [initialLoad, setInitialLoad] = useState(true);
  const [isListening, setListening] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isLoadingKey, setLoadingKey] = useState(true);
  const [isProcessing, setProcessing] = useState(false);

  const [micOpen, setMicOpen] = useState(false);
  const [microphone, setMicrophone] = useState<MediaRecorder | null>();
  const [textInput, setTextInput] = useState<string>("");
  const [userMedia, setUserMedia] = useState<MediaStream | null>();
  const [utterance, setUtterance] = useState<LLMMessage>(blankUserMessage);

  const [voiceActivity, setVoiceActivity] = useState<{
    voiceActivity: boolean;
    timestamp: number;
  }>();

  /**
   * Queues
   */
  const {
    add: addToQueue,
    remove: removeFromQueue,
    first: topOfQueue,
    size: queueSize,
    queue: dataQueue,
  } = useQueue<Blob>([]);

  /**
   * toggle microphone on/off function
   */
  const toggleMicrophone = useCallback(async () => {
    if (initialLoad) {
      setInitialLoad(!initialLoad);
      append({
        role: "system",
        content: systemContent,
      });
    }

    if (microphone && userMedia) {
      setUserMedia(null);
      setMicrophone(null);

      if (microphone) {
        microphone.stop();
      }
    } else {
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      const context = new AudioContext();
      await context.audioWorklet.addModule(`/vad.worklet.js?v=${Date.now()}`);

      const source = context.createMediaStreamSource(userMedia);
      const workletNode = new AudioWorkletNode(
        context,
        "voice-activity-processor"
      );

      source.connect(workletNode);
      workletNode.connect(context.destination);
      workletNode.port.onmessage = (
        e: MessageEvent<{ voiceActivity: boolean; timestamp: number }>
      ) => setVoiceActivity(e.data);

      const microphone = new MediaRecorder(userMedia);
      microphone.start(500);

      microphone.onstart = () => {
        setMicOpen(true);
      };

      microphone.onstop = () => {
        setMicOpen(false);
      };

      microphone.ondataavailable = (e) => {
        addToQueue(e.data);
      };

      setUserMedia(userMedia);
      setMicrophone(microphone);
    }
  }, [initialLoad, microphone, userMedia, append, addToQueue]);

  /**
   * getting a new api key
   */
  useEffect(() => {
    if (!apiKey) {
      fetch("/api/authenticate", { cache: "no-store" })
        .then((res) => res.json())
        .then((object) => {
          if (!("key" in object)) throw new Error("No api key returned");

          setApiKey(object);
          setLoadingKey(false);
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, [apiKey]);

  /**
   * connect to deepgram
   */
  useEffect(() => {
    if (apiKey && "key" in apiKey) {
      const deepgram = createClient(apiKey?.key ?? "");
      const connection = deepgram.listen.live({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        endpointing: 250,
      });

      /**
       * connection established
       */
      connection.on(LiveTranscriptionEvents.Open, (e: any) => {
        setListening(true);

        /**
         * connection closed
         */
        connection.on(LiveTranscriptionEvents.Close, (e: any) => {
          setListening(false);
          setApiKey(null);
          setConnection(null);
        });

        /**
         * error detected
         */
        connection.on(LiveTranscriptionEvents.Error, (e: any) => {
          console.error("websocket event: Error", e);
        });

        /**
         * transcript response received
         */
        connection.on(
          LiveTranscriptionEvents.Transcript,
          (data: LiveTranscriptionEvent) => {
            const content = utteranceText(data);

            if (content) {
              if (data.is_final) {
                append({
                  role: "user",
                  content,
                });
                setUtterance(blankUserMessage);
              } else {
                setUtterance({
                  role: "user",
                  content,
                });
              }
            }
          }
        );
      });

      setConnection(connection);
      setLoading(false);
    }
  }, [append, apiKey]);

  /**
   * magic audio queue processing
   */
  useEffect(() => {
    const processQueue = async () => {
      if (queueSize > 0 && !isProcessing) {
        setProcessing(true);

        if (isListening) {
          if (topOfQueue) {
            connection?.send(topOfQueue);
          }

          removeFromQueue();
        }

        const waiting = setTimeout(() => {
          clearTimeout(waiting);
          setProcessing(false);
        }, 250);
      }
    };

    processQueue();
  }, [
    connection,
    dataQueue,
    removeFromQueue,
    topOfQueue,
    queueSize,
    isProcessing,
    isListening,
  ]);

  /**
   * keep alive when mic closed
   */
  useEffect(() => {
    let keepAlive: any;
    if (connection && isListening && !micOpen) {
      keepAlive = setInterval(() => {
        // should stop spamming dev console when working on frontend in devmode
        if (connection?.getReadyState() !== LiveConnectionState.OPEN) {
          clearInterval(keepAlive);
        } else {
          connection.keepAlive();
        }
      }, 10000);
    } else {
      clearInterval(keepAlive);
    }

    // prevent duplicate timeouts
    return () => {
      clearInterval(keepAlive);
    };
  }, [connection, isListening, micOpen]);

  // this works
  useEffect(() => {
    if (messageMarker.current) {
      messageMarker.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [gptmessages, utterance]);

  // /**
  //  * registering key up/down events
  //  */
  // useEffect(() => {
  //   const onKeyUp = (event: Event | KeyboardEvent) => {
  //     if ("key" in event && event.code === "Space") {
  //       event.preventDefault();
  //       toggleMicrophone();
  //     }
  //   };

  //   if (isListening) {
  //     document.addEventListener("keyup", onKeyUp);
  //   }

  //   return () => {
  //     document.removeEventListener("keyup", onKeyUp);
  //   };
  // }, [isListening, toggleMicrophone]);

  /**
   * loading message (api key)
   */
  if (isLoadingKey) {
    return (
      <span className="w-full text-center">Loading temporary API key...</span>
    );
  }

  /**
   * loading message (app)
   */
  if (isLoading) {
    return <span className="w-full text-center">Loading the app...</span>;
  }

  return (
    <>
      <div className="flex h-full antialiased bg-black/30 shadow-lg backdrop-blur-[2px] ring-1 ring-black/5 rounded-lg">
        <div className="group fixed top-0 right-0 p-2 flex items-start justify-end w-24 h-24">
          <div className="text-white shadow-xl flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-black/50 to-black z-50 absolute">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="w-6 h-6 group-hover:rotate-90 group-active:rotate-90 transition-all duration-[0.6s]"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="absolute rounded-full transition-all duration-[0.2s] ease-out scale-y-0 group-hover:scale-y-100 group-hover:-translate-x-16 group-active:scale-y-100 group-active:-translate-x-16 flex p-2 hover:p-3 bg-[#7800ED]/50  hover:bg-[#7800ED]/80 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5"
              />
            </svg>
          </div>
          <div className="absolute rounded-full transition-all duration-[0.2s] ease-out scale-x-0 group-hover:scale-x-100 group-hover:translate-y-16 group-active:scale-x-100 group-active:translate-y-16 flex p-2 hover:p-3 bg-[#EE028C]/50  hover:bg-[#EE028C]/80  text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          </div>
          <div className="absolute rounded-full transition-all duration-[0.2s] ease-out scale-x-0 group-hover:scale-x-100 group-hover:translate-y-14 group-hover:-translate-x-14 group-active:scale-x-100 group-active:translate-y-14 group-active:-translate-x-14 flex p-2 hover:p-3  bg-[#F0463A]/50  hover:bg-[#F0463A]/80 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
              />
            </svg>
          </div>
        </div>
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            <div className="flex flex-col justify-between h-full pt-4">
              <div
                className={`flex flex-col h-full pb-6 overflow-hidden ${
                  initialLoad ? "justify-center" : "justify-end"
                }`}
              >
                <div className="grid grid-cols-12 overflow-x-auto gap-y-2">
                  {initialLoad && <InitialLoad fn={toggleMicrophone} />}

                  {getConversationMessages(gptmessages).length > 0 &&
                    getConversationMessages(gptmessages).map((message, i) => (
                      <ChatBubble message={message} key={i} />
                    ))}

                  {utterance && utterance.content && (
                    <RightBubble
                      text={utterance.content}
                      blink={true}
                      meta={"20ms"}
                    ></RightBubble>
                  )}

                  <div ref={messageMarker}></div>
                </div>
              </div>
              <div className="flex flex-row items-center h-16 rounded-xl bg-zinc-900 w-full px-3 text-sm sm:text-base">
                <div className="mr-3">
                  <button
                    onClick={() => toggleMicrophone()}
                    className={`group flex items-center justify-center rounded-lg hover:bg-white text-white hover:text-black px-4 lg:px-6 py-2 flex-shrink-0 ${
                      micOpen ? "bg-[#3A00D3]/50 " : "bg-[#F0463A]/50"
                    }`}
                  >
                    <div className="w-4 h-4 hidden sm:inline mr-2">
                      <svg
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                      </svg>
                    </div>

                    <span>
                      {micOpen
                        ? `${isBrowser ? "Click" : "Tap"} to stop`
                        : `${isBrowser ? "Click" : "Tap"} to start`}

                      <span className="hidden md:inline">
                        {isBrowser && (
                          <>
                            {" "}
                            <small
                              className={`group-hover:text-gray-500 ${
                                micOpen ? "text-blue-100" : "text-red-200"
                              }`}
                            >
                              or press &apos;space&apos;
                            </small>
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                </div>
                <div className="flex-grow">
                  <div className="relative w-full">
                    {/**
                     * text input field
                     */}
                    <input
                      /*disabled={initialLoad || micOpen}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyUp={(e) => {
                        if (e.key === "Enter" && textInput !== "") {
                          addMessage({
                            role: "user",
                            content: textInput,
                          });
                          setTextInput("");
                        }
                      }}*/
                      type="text"
                      className={`flex w-full border rounded-lg border-zinc-600 focus:outline-none focus:border-indigo-300 pl-4 h-10 ${
                        initialLoad || micOpen ? "opacity-30" : "opacity-100"
                      }`}
                      placeholder={
                        initialLoad
                          ? "... or send me a message ..."
                          : micOpen
                          ? "... close mic to send a message ..."
                          : "Send me a message"
                      }
                    />
                  </div>
                </div>
                <div className="ml-3">
                  <button
                    /*onClick={() => {
                      addMessage({
                        role: "user",
                        content: textInput,
                      });
                      setTextInput("");
                    }}
                    disabled={initialLoad || micOpen}*/
                    className={`flex items-center justify-center bg-[#00CF56]/50 rounded-lg text-white px-4 lg:px-6 py-2 flex-shrink-0 ${
                      initialLoad || micOpen
                        ? "opacity-30"
                        : "opacity-100 hover:bg-white hover:text-black"
                    }`}
                  >
                    <span>Send</span>
                    <svg
                      className="w-4 h-4 transform rotate-45 -mt-1 ml-4 hidden sm:inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
