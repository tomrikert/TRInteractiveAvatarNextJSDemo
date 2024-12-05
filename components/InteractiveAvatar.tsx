import type { SpeakRequest, StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";


export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function saveUserData() {
    const userData = {
      firstName,
      lastName,
      role,
      email,
      language,
    };

    try {
      const response = await fetch("http://localhost:9000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error("Failed to save user data");
      }

      console.log("User data saved successfully");
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  }

  function createUserSummary() {
    return `The user's name is ${firstName} ${lastName}, and they are a ${role}. Their email is ${email}, and they prefer to communicate in ${language}.`;
  }

  async function loadKnowledgeBase() {
    try {
      const response = await fetch('http://localhost:9000/api/knowledge-base', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base');
      }

      const knowledgeBaseContent = await response.text();

      return `The user's name is ${firstName} ${lastName}, and they are a ${role}. Their email is ${email}, and they prefer to communicate in ${language}. ${knowledgeBaseContent}`;
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      return `The user's name is ${firstName} ${lastName}, and they are a ${role}. Their email is ${email}, and they prefer to communicate in ${language}.`;
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    await saveUserData();
    const newToken = await fetchAccessToken();
    const knowledgeBaseContent = await loadKnowledgeBase();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: "eb0a8cc8046f476da551a5559fbb5c82",
        knowledgeBase: knowledgeBaseContent,
        voice: {
          rate: 0.5,
          emotion: VoiceEmotion.EXCITED,
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);

      function createIntroSpeech() {
        return `Welcome! I'm excited to start working with you, ${firstName}. I see that your role is as a ${role}. What would you like to discuss today?`;
      }
      // Speak introductory text
      await avatar.current.speak({
        text: createIntroSpeech(),
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC
      });

      // Start listening to the user
      await avatar.current?.startVoiceChat({
        useSilencePrompt: true // TR change from false to true - testing
      });
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }

  
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }

    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current.speak({ text: text, taskType: TaskType.TALK, taskMode: TaskMode.SYNC }).catch((e) => {  //Change from TaskType.REPEAT
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="flex justify-center items-center">
          <p className="text-lg font-bold">Welcome to your coaching session</p>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col justify-center items-start p-4">
          <ul className="pl-5">
            <li className="flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-indigo-500" />
              We’re glad you’re here! Start by selecting your language and sharing your name. Next reflect on a few things to think about to help you make the most of your coaching session today.
            </li>
            <li className="flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-indigo-500" />
              Identify your coaching topic: Is it a specific situation, relationship or behavior vs part of a bigger challenge or pattern you’d like to change?
            </li>
            <li className="flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-indigo-500" />
              Determine where your coach can help you most: Do you want help in identifying the problem, exploring it more deeply, brainstorming solutions or creating a clear action plan?
            </li>
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt 
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
              <div className="flex flex-col gap-2 w-full">
                <p className="text-sm font-medium leading-none">
                  Enter your first name
                </p>
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <p className="text-sm font-medium leading-none">
                  Enter your last name
                </p>
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <p className="text-sm font-medium leading-none">
                  Enter your role
                </p>
                <Input
                  placeholder="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
                <p className="text-sm font-medium leading-none">
                  Enter your email
                </p>
                <Input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start session
              </Button>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
