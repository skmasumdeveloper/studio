"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import dynamic from 'next/dynamic';

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

  const handleStartVideoCall = () => {
    router.push(`/video-call/${groupId}`);
  };

  return (
    <div className="flex flex-col h-screen">
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{groupName}</CardTitle>
           <Button variant="outline" size="icon" onClick={handleStartVideoCall}>
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
