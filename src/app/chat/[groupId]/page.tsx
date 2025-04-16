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

const auth = getAuth(app);

export default function ChatPage() {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { groupId } = useParams();
  const scrollAreaRef = useRef(null);


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
    });

    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    // Scroll to bottom on new message
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
        // @ts-expect-error
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);


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

  return (
    <div className="flex flex-col h-screen">
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>Group Chat</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex flex-col">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`mb-2 ${msg.uid === user?.uid ? 'text-right' : 'text-left'}`}>
                <div className="text-xs text-muted-foreground">{msg.displayName}</div>
                <div className={`inline-block p-2 rounded-lg ${msg.uid === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="p-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Enter your message..."
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
