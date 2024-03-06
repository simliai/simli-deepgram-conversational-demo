"use client";

import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AudioPacket } from "../lib/types";
import { usePlayQueue } from "./PlayQueue";
import { silentMp3 } from "../lib/constants";

type NowPlayingContext = {
  nowPlaying: AudioPacket | undefined;
  setNowPlaying: Dispatch<SetStateAction<AudioPacket | undefined>>;
  clearNowPlaying: () => void;
  player: MutableRefObject<HTMLAudioElement | undefined>;
};

interface NowPlayingContextInterface {
  children: React.ReactNode;
}

const NowPlayingContext = createContext({} as NowPlayingContext);

const NowPlayingContextProvider = ({
  children,
}: NowPlayingContextInterface) => {
  const [nowPlaying, setNowPlaying] = useState<AudioPacket>();
  const player = useRef<HTMLAudioElement | undefined>(
    typeof Audio !== "undefined" ? new Audio("") : undefined
  );
  const { updateItem } = usePlayQueue();

  useEffect(() => {
    const playElem: HTMLAudioElement = document.getElementById(
      "playElem"
    ) as HTMLAudioElement;

    if (nowPlaying && playElem) {
      const data = window.URL.createObjectURL(nowPlaying.blob);
      playElem.src = data;
      playElem.addEventListener("canplay", function () {
        this.play();
      });

      playElem.addEventListener("ended", () => {
        updateItem(nowPlaying.id, { played: true });
        clearNowPlaying();
      });
    }

    // if (nowPlaying && player.current) {
    //   player.current.src = window.URL.createObjectURL(nowPlaying.blob);
    //   player.current.addEventListener("canplaythrough", function () {
    //     this.play();
    //   });

    //   player.current.addEventListener("ended", () => {
    //     updateItem(nowPlaying.id, { played: true });
    //     clearNowPlaying();
    //   });
    // }
  });

  const clearNowPlaying = () => {
    setNowPlaying(undefined);
  };

  return (
    <NowPlayingContext.Provider
      value={{ nowPlaying, setNowPlaying, clearNowPlaying, player }}
    >
      <audio id="playElem" controls style={{ display: "none" }}>
        <source src={silentMp3} type="audio/mp3" />
      </audio>
      {children}
    </NowPlayingContext.Provider>
  );
};

function useNowPlaying() {
  return useContext(NowPlayingContext);
}

export { NowPlayingContextProvider, useNowPlaying };
