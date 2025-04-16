"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  addDoc,
  orderBy,
  query,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app, db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const auth = getAuth(app);

// WebRTC dependencies
import Peer from 'peerjs';

export default function ChatPage() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { groupId } = useParams();
  const scrollAreaRef = useRef<any>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // WebRTC states and refs
  const [peers, setPeers] = useState<any>({});
  const [myPeer, setMyPeer] = useState<any>(null);
  const [myStream, setMyStream] = useState<any>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peersVideoRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        setHasCameraPermission(true);
        setMyStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
  }, [toast]);


  useEffect(() => {
    if (!groupId) return;

    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messages);
       // Scroll to bottom on new message
      setTimeout(() => {
            if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            }
        }, 100); // Delay to allow rendering
    });

    return () => unsubscribe();
  }, [groupId]);


  useEffect(() => {
    if (!groupId || !user || !myStream) return;

    const peer = new Peer(user.uid);

    peer.on('open', (id) => {
      console.log('Peer connected with ID: ', id);
      setMyPeer(peer);
    });

    peer.on('call', (call) => {
      call.answer(myStream);
      call.on('stream', (userVideoStream) => {
        if (peersVideoRef.current) {
          const video = document.createElement('video');
          video.muted = false;
          video.srcObject = userVideoStream;
          video.addEventListener('loadedmetadata', () => {
            video.play();
          });
          video.classList.add("w-full", "aspect-video", "rounded-md")
          peersVideoRef.current.append(video);
        }
      });
    });

    // Handle peer disconnection
    peer.on('disconnected', () => {
        console.log('Peer disconnected');
        peer.reconnect();
    });

    // Handle peer error
    peer.on('error', (err) => {
        console.log('Peer error:', err);
    });


    return () => {
        peer.disconnect();
        peer.destroy();
    };

  }, [groupId, user, myStream]);



  const sendMessage = async () => {
    if (!newMessage || !groupId || !user) return;

    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      await addDoc(messagesRef, {
        text: newMessage,
        createdAt: Timestamp.now(),
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message: ', error);
    }
  };

  const callPeer = (peerId: string) => {
    if (myStream) {
      const call = myPeer.call(peerId, myStream);

      call.on('stream', (userVideoStream) => {
        if (peersVideoRef.current) {
          const video = document.createElement('video');
          video.muted = false;
          video.srcObject = userVideoStream;
           video.addEventListener('loadedmetadata', () => {
                video.play();
            });
          video.classList.add("w-full", "aspect-video", "rounded-md")
          peersVideoRef.current.append(video);
        }
      });

      call.on('close', () => {
        console.log('Call closed');
        // Clean up video element
        if (peersVideoRef.current) {
          Array.from(peersVideoRef.current.children).forEach((video:any) => {
              if (video.srcObject === call.remoteStream) {
                  video.remove();
              }
          });
        }
      });
    } else {
        toast({
            variant: 'destructive',
            title: 'Camera Access Required',
            description: 'Please allow camera access to make a call.',
        });
    }
  };


  return (
    <div className="flex flex-col h-screen">
          {hasCameraPermission === false && (
                <Alert variant="destructive">
                          <AlertTitle>Camera Access Required</AlertTitle>
                          <AlertDescription>
                            Please allow camera access to use this feature.
                          </AlertDescription>
                  </Alert>
          )
          }
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>Group Chat</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex flex-col">
              <div className="flex justify-center items-center space-x-4 p-4">
                  <video ref={videoRef} className="w-32 aspect-video rounded-md" autoPlay muted />
                  <div ref={peersVideoRef} className="flex space-x-4">
                    {/*  Other user's videos will be displayed here */}
                  </div>
              </div>
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="flex flex-col">
              {messages.map((msg) => (
                <div key={msg.id} className={`mb-4 flex items-start ${msg.uid === user?.uid ? 'self-end text-right' : 'text-left'}`}>
                  {msg.uid !== user?.uid && (
                    <Avatar className="mr-2 h-8 w-8">
                      {/*  REMOVED RANDOM IMAGE AND ADDED FIRST LETTER OF USERNAME */}
                      <AvatarFallback>{msg.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">{msg.displayName}</div>
                    <div className={`inline-block p-2 rounded-lg ${msg.uid === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={lastMessageRef} style={{ float: "left", clear: "both" }}>
              </div>
            </div>
          </ScrollArea>
          <div className="p-4 pb-20">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Enter your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
