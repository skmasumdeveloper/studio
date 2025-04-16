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
  doc,
  getDoc,
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
import { Icons } from '@/components/icons';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PeerWithNoSSR = dynamic(() => import('peerjs').then((PeerJS) => PeerJS.Peer), {
  ssr: false,
  loading: () => <p>Loading PeerJS...</p>,
});

const auth = getAuth(app);

export default function ChatPage() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { groupId } = useParams();
  const scrollAreaRef = useRef<any>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [groupName, setGroupName] = useState(''); // State to store group name
  const router = useRouter();

    // WebRTC states
    const [peerId, setPeerId] = useState<string | null>(null);
    const [remotePeerIdValue, setRemotePeerIdValue] = useState('');
    const myVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerInstance = useRef<any>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);

  useEffect(() => {
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
        const getGroupName = async () => {
            if (groupId) {
                const groupDoc = await getDoc(doc(db, 'groups', groupId));
                if (groupDoc.exists()) {
                    setGroupName(groupDoc.data().name);
                } else {
                    setGroupName('Group Not Found');
                }
            }
        };
        getGroupName();
    }, [groupId]);

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
           // Scroll to bottom on new message
           setTimeout(() => {
            if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            }
        }, 100); // Delay to allow rendering
    } catch (error) {
      console.error('Error sending message: ', error);
    }
  };

    // WebRTC functions
    useEffect(() => {
      // Get camera permission
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({video: true});
          setHasCameraPermission(true);

          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
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
        if (!user || !hasCameraPermission) return;

        // Initialize PeerJS
        const peer = new PeerWithNoSSR();

        peer.on('open', (id: any) => {
            setPeerId(id);
            peerInstance.current = peer;
        });

        peer.on('call', async (call: any) => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (myVideoRef.current) {
                    myVideoRef.current.srcObject = stream;
                }

                call.answer(stream);

                call.on('stream', (remoteStream: any) => {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remoteStream;
                    }
                });
            } catch (err) {
                console.error('Failed to get local stream', err);
            }
        });

        return () => {
            peer.disconnect();
            peer.destroy();
        };
    }, [user, hasCameraPermission]);

    const call = async () => {
        if (remotePeerIdValue === '' || !peerInstance.current) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please enter a valid peer ID to call.',
            });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (myVideoRef.current) {
                myVideoRef.current.srcObject = stream;
            }

            const call = peerInstance.current.call(remotePeerIdValue, stream);

            call.on('stream', (remoteStream: any) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }
            });
        } catch (err) {
            console.error('Failed to get local stream', err);
        }
    };

  return (
    <div className="flex flex-col h-screen">
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{groupName}</CardTitle>
           <Button variant="outline" size="icon" onClick={call}>
                <Icons.video className="h-4 w-4" />
            </Button>
        </CardHeader>
        <CardContent className="h-full flex flex-col">
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

           <div className="p-4">
                        {peerId && <Label>Your Peer ID: {peerId}</Label>}
                        <div className="flex items-center space-x-2">
                            <Input
                                type="text"
                                placeholder="Enter remote peer ID"
                                value={remotePeerIdValue}
                                onChange={(e) => setRemotePeerIdValue(e.target.value)}
                            />
                        </div>
                    </div>
            <div className="p-4 flex justify-center">
                            <video ref={myVideoRef} className="w-64 h-48 rounded-md" autoPlay muted />
                            <video ref={remoteVideoRef} className="w-64 h-48 rounded-md" autoPlay />

                            { !(hasCameraPermission) && (
                                <Alert variant="destructive">
                                    <AlertTitle>Camera Access Required</AlertTitle>
                                    <AlertDescription>
                                        Please allow camera access to use this feature.
                                    </AlertDescription>
                                </Alert>
                            )
                            }
                        </div>
          <div className="p-4 pb-24">
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

