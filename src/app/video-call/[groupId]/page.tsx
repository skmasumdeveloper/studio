"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';

const PeerWithNoSSR = dynamic(() => import('peerjs').then((PeerJS) => PeerJS.Peer), {
  ssr: false,
  loading: () => <p>Loading PeerJS...</p>,
});

const auth = getAuth(app);

export default function VideoCallPage() {
  const [user] = useAuthState(auth);
  const { groupId } = useParams();
  const { toast } = useToast();

  const [peerId, setPeerId] = useState<string | null>(null);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<any>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

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
    if (!user || !hasCameraPermission) return;

    let peer: any = null;
    const initializePeer = async () => {
      try {
        const PeerJS = await import('peerjs');
        peer = new PeerJS.Peer();

        peer.on('open', (id: any) => {
          setPeerId(id);
          peerInstance.current = peer;

          // Attempt to connect to existing peers in the group
          autoConnectToPeer(peer, groupId as string);
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
  }, [user, hasCameraPermission, groupId, toast]);

  const autoConnectToPeer = async (peer: any, groupId: string) => {
    // Basic logic to connect to a peer - improve this for production
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
      }

      // Here you would fetch existing peer IDs from Firestore for the group
      // For simplicity, let's assume you have a function to do this
      const existingPeerIds = await getExistingPeerIds(groupId);

      existingPeerIds.forEach(peerId => {
        if (peerId !== peer.id) { // Don't call yourself
            console.log('Calling peer ID: ', peerId);
            const call = peer.call(peerId, stream);

            call.on('stream', (remoteStream: any) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }
            });
        }
    });
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  };

  const getExistingPeerIds = async (groupId: string): Promise<string[]> => {
    // Replace this with your actual Firestore retrieval logic
    // This is just a placeholder to simulate fetching peer IDs
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate fetching peer IDs from Firestore
        const peerIds = ['test-peer-id-1', 'test-peer-id-2']; // Replace with actual peer IDs
        resolve(peerIds);
      }, 1000); // Simulate network latency
    });
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
    </div>
  );
}
