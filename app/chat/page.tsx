"use client";

import Pusher from 'pusher-js';
import { useSearchParams} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import axios from "axios";

interface User {
    name: string
}

interface Message {
    from: string
    body: string
    to: string
}

function Chat() {
    const searchParams = useSearchParams()
    const [users, setUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageToSend, setMessageToSend] = useState<string>('');

    const setupPusher = useCallback(() => {
        const pusher = new Pusher("", {
            cluster: "ap3",
            channelAuthorization: {
                endpoint: "http://localhost:8080/pusher/auth",
                transport: 'ajax'
            }
        });

        const channel = pusher.subscribe("new-login");

        const privateChannel = pusher.subscribe(`private-chat-${searchParams.get("username")}`);
        privateChannel.bind("pusher:subscription_succeeded", () => {
            console.log("Successfully subscribed to private channel");
        });

        privateChannel.bind("pusher:subscription_error", (error: Error) => {
            console.error("Error subscribing to private channel:", error);
        });

        privateChannel.bind("new-message", (data: Message) => {
            setMessages((prev) => [...prev, data]);
        });

        channel.bind("user-connected", (data: User) => {
            console.log("User connected:", data);
            setUsers((prevUsers) => {
                if (!prevUsers.some((u) => u.name === data.name)) {
                    return [...prevUsers, data];
                }
                return prevUsers;
            });
        });

        channel.bind("user-disconnected", (data: User) => {
            console.log("User disconnected:", data);
            setUsers((prevUsers) => prevUsers.filter((u) => u.name !== data.name));
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
            pusher.unsubscribe(`private-chat-${searchParams.get('username')}`);
        };
    }, []);

    useEffect(() => {
        const cleanup = setupPusher();
        return () => {
            cleanup();
        };
    }, [setupPusher]);

    const joinChat = async () => {
        if (searchParams.get('username')?.trim()) {
            try {
                const user: User = { name: searchParams.get('username')! };
                await axios.post("http://localhost:8080/api/chat/join", user);
                await fetchUsers();
            } catch (error) {
                console.error("Error joining chat:", error);
            }
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get("http://localhost:8080/api/chat/users");
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        if (searchParams.get('username')) {
            joinChat()
        }
    }, []);

    const sendMessage = async () => {
        if (!selectedUser || !messageToSend.trim()) {
            console.error("No message or user selected");
            return;
        }
        const newMessage: Message = {
            body: messageToSend,
            to: selectedUser.name,
            from: searchParams.get('username')!
        };
        try {
            const response = await fetch("http://localhost:8080/api/chat/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newMessage)
            });
            if (!response.ok) {
                console.error("Error sending message");
                return;
            }
            setMessages(prev => [...prev, newMessage]);
            setMessageToSend('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }

    const selectUser = (user: User) => {
        setSelectedUser(user);
    }

    const filteredMessages = messages.filter(message =>
        (message.from === selectedUser?.name && message.to === searchParams.get('username')) ||
        (message.from === searchParams.get('username') && message.to === selectedUser?.name)
    );

    return (
        <>
            <main className="flex w-full min-h-screen bg-white p-12">
                <div className="flex space-x-3 w-full h-[800px] bg-violet-500 shadow rounded-lg p-12">
                    <div className="flex flex-col w-1/2 h-full border border-white p-8">
                        {users.map((user) => (
                            user.name !== searchParams.get('username') && (
                                <div key={user.name} onClick={() => selectUser(user)}
                                     className="bg-white p-2 mb-2 cursor-pointer rounded-lg">
                                    {user.name}
                                </div>
                            )
                        ))}
                    </div>

                    <div className="flex w-1/2 h-full border border-white p-8">
                        <div className="flex flex-col flex-1 justify-between w-full h-full bg-white p-4">
                            <div>
                                <p>Selected User: {selectedUser?.name}</p>
                                <div className="overflow-y-auto max-h-[600px]">
                                    {filteredMessages.length === 0 ? (
                                        <p>No messages available</p>
                                    ) : (
                                        filteredMessages.map((message, index) => (
                                            <div key={index} className={`mb-2 ${message.from === searchParams.get('username') ? 'text-right' : 'text-left'}`}>
                                                <strong>{message.from}: </strong>
                                                {message.body}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    value={messageToSend}
                                    onChange={(e) => setMessageToSend(e.target.value)}
                                    className="py-1 px-2 border border-gray-300 w-full h-[70px]"
                                    placeholder="Enter message"
                                />
                                <button onClick={sendMessage} className="bg-violet-500 text-white p-3 ml-5">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}

export default Chat;