"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth
} from 'firebase/auth';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import {initializeApp} from "firebase/app";

import { app, db } from '@/lib/firebase'; // Firebase configuration
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, SidebarSeparator } from "@/components/ui/sidebar";
import { Icons } from '@/components/icons';
import Link from 'next/link';

const auth = getAuth(app);

export default function Home() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();


  useEffect(() => {
    if (!loading && !user && !error) {
      router.push('/login');
    }
  }, [user, loading, router, error]);


  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <h2 className="text-lg font-bold">ChirpChat</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton><Icons.home className="mr-2" />Home</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton><Icons.messageSquare className="mr-2" />Groups</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton><Icons.settings className="mr-2" />Settings</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <Button variant="outline" onClick={() => auth.signOut()}>Logout</Button>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-4">Welcome to ChirpChat</h1>
          <GroupManagement auth={auth}/>
        </div>
      </div>
    </SidebarProvider>
  );
}

function GroupManagement({auth}:any) {
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState<any[]>([]); // Replace 'any' with your Group type if you have one
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const createGroup = async () => {
    if (!groupName) return;

    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        creatorId: user?.uid,
        members: [user?.uid],
      });

      console.log('Group created with ID: ', groupRef.id);
      setGroupName('');
      fetchGroups();
    } catch (error) {
      console.error('Error creating group: ', error);
    }
  };

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      const groupList: any[] = []; // Replace 'any' with your Group type if you have one
      querySnapshot.forEach((doc) => {
        groupList.push({ id: doc.id, ...doc.data() });
      });
      setGroups(groupList);
    } catch (error) {
      console.error('Error fetching groups: ', error);
    }
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Group</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <Button onClick={createGroup}>Create Group</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length > 0 ? (
            <ul>
              {groups.map((group) => (
                <li key={group.id} className="py-2">
                  <Link href={`/chat/${group.id}`}>{group.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No groups joined yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
