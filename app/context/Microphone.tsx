"use client";

import { useQueue } from "@uidotdev/usehooks";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type MicrophoneContext = {
  microphone: MediaRecorder | undefined;
  setMicrophone: Dispatch<SetStateAction<MediaRecorder | undefined>>;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  microphoneOpen: boolean;
  enqueueBlob: (element: Blob) => void;
  removeBlob: () => Blob | undefined;
  firstBlob: Blob | undefined;
  queueSize: number;
  queue: Blob[];
};

interface MicrophoneContextInterface {
  children: React.ReactNode;
}

const MicrophoneContext = createContext({} as MicrophoneContext);

const MicrophoneContextProvider = ({
  children,
}: MicrophoneContextInterface) => {
  const [microphone, setMicrophone] = useState<MediaRecorder>();
  const [microphoneOpen, setMicrophoneOpen] = useState(false);
  const {
    add: enqueueBlob, // addMicrophoneBlob,
    remove: removeBlob, // removeMicrophoneBlob,
    first: firstBlob, // firstMicrophoneBlob,
    size: queueSize, // countBlobs,
    queue, // : microphoneBlobs,
  } = useQueue<Blob>([]);

  useEffect(() => {
    async function setupMicrophone() {
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      const microphone = new MediaRecorder(userMedia);
      microphone.start(500);

      setMicrophone(microphone);
    }

    if (!microphone) {
      setupMicrophone();
    }
  }, [enqueueBlob, microphone, microphoneOpen]);

  useEffect(() => {
    if (!microphone) return;

    microphone.ondataavailable = (e) => {
      if (microphoneOpen) enqueueBlob(e.data);
    };

    return () => {
      microphone.ondataavailable = null;
    };
  }, [enqueueBlob, microphone, microphoneOpen]);

  useEffect(() => {
    console.log(queue);
  }, [queue]);

  const stopMicrophone = useCallback(() => {
    setMicrophoneOpen(false);
  }, []);

  const startMicrophone = useCallback(() => {
    setMicrophoneOpen(true);
  }, []);

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        setMicrophone,
        startMicrophone,
        stopMicrophone,
        microphoneOpen,
        enqueueBlob,
        removeBlob,
        firstBlob,
        queueSize,
        queue,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

function useMicrophone() {
  return useContext(MicrophoneContext);
}

export { MicrophoneContextProvider, useMicrophone };
