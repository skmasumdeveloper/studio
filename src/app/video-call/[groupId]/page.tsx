"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from "@/components/ui/button";

const PeerWithNoSSR = dynamic(() => import('peerjs').then((PeerJS) => PeerJS.Peer), {
  ssr: false,
  loading: () => <p>Loading PeerJS...</p>,
});

const auth = getAuth(app);

export default function VideoCallPage() {
  const [user] = useAuthState(auth);
  const { groupId } = useParams();
  const { toast } = useToast();
  const router = useRouter();

  const [peerId, setPeerId] = useState<string | null>(null);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<any>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [remotePeerIds, setRemotePeerIds] = useState<string[]>([]);
  const [isCallEnded, setIsCallEnded] = useState(false);


  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
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
    if (!user || !hasCameraPermission || isCallEnded) return;

    let peer: any = null;
    const initializePeer = async () => {
      try {
        const PeerJS = await import('peerjs');
        peer = new PeerJS.Peer();

        peer.on('open', async (id: any) => {
          setPeerId(id);
          peerInstance.current = peer;

          // Add peer ID to Firestore
          const groupRef = doc(db, 'groups', groupId as string);
          await updateDoc(groupRef, {
            peerIds: arrayUnion(id)
          });

          // Get existing peer IDs from Firestore and connect
          const groupDoc = await getDoc(groupRef);
          if (groupDoc.exists()) {
              const data = groupDoc.data();
              const existingPeerIds = data.peerIds || [];
              setRemotePeerIds(existingPeerIds);
              existingPeerIds.forEach(peerId => {
                if (peerId !== id) {
                  connectToPeer(peer, peerId);
                }
              });
          }

        });

        peer.on('call', async (call: any) => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
      } catch (error) {
        console.error('Failed to initialize PeerJS', error);
      }
    };

    initializePeer();

    return () => {
      if (peer) {
        peer.disconnect();
        peer.destroy();
      }
    };
  }, [user, hasCameraPermission, groupId, toast, isCallEnded]);

    useEffect(() => {
        if (!peerId || !groupId) return;

        const groupRef = doc(db, 'groups', groupId);

        const unsubscribe = onSnapshot(groupRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const peerIds = data.peerIds || [];

                // Filter out current peerId and update remotePeerIds state
                const filteredPeerIds = peerIds.filter((id:string) => id !== peerId);
                setRemotePeerIds(filteredPeerIds);
            }
        });
        return () => unsubscribe();
    }, [peerId, groupId]);


  const connectToPeer = async (peer: any, peerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      console.log('Calling peer ID: ', peerId);
      const call = peer.call(peerId, stream);

      call.on('stream', (remoteStream: any) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
      call.on('error', (err:any) => {
        console.error('Call stream error', err);
      });
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  };

  const handleEndCall = async () => {
    setIsCallEnded(true);

    // Remove peer ID from Firestore
    if (peerId && groupId) {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        peerIds: arrayRemove(peerId)
      });
    }

    if (peerInstance.current) {
      peerInstance.current.disconnect();
      peerInstance.current.destroy();
    }

    // Redirect to chat page
    router.push(`/chat/${groupId}`);
  };


  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">Video Call</h1>
      <div className="flex space-x-4">
        <video ref={myVideoRef} className="w-64 h-48 rounded-md" autoPlay muted />
        <video ref={remoteVideoRef} className="w-64 h-48 rounded-md" autoPlay />
      </div>

      { !(hasCameraPermission) && (
        <Alert variant="destructive">
          <AlertTitle>Camera Access Required</AlertTitle>
          <AlertDescription>
            Please allow camera access to use this feature.
          </AlertDescription>
        </Alert>
      )
      }
            <Button onClick={handleEndCall} className="mt-4">
                End Call
            </Button>
    </div>
  );
}
