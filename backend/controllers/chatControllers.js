const expressAsyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");

// Handle chat access
const accessChat = expressAsyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        console.log("UserId param not sent with request");
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        // Check if chat already exists
        let chat = await Chat.find({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: req.user._id } } },
                { users: { $elemMatch: { $eq: userId } } },
            ]
        })
        .populate("users", "-password")
        .populate("latestMessage");

        chat = await User.populate(chat, {
            path: "latestMessage.sender",
            select: "name pic email",
        });

        if (chat.length > 0) {
            return res.status(200).json(chat[0]);
        } else {
            const chatData = {
                chatName: "sender",
                isGroupChat: false,
                users: [req.user._id, userId],
            };

            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id })
                .populate("users", "-password");
            return res.status(200).json(fullChat);
        }
    } catch (error) {
        console.error("Error in accessChat:", error.message);
        return res.status(500).json({ message: error.message });
    }
});

// Fetch chats for the logged-in user
const fetchChats = expressAsyncHandler(async (req, res) => {
    try {
        const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        const populatedChats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name pic email",
        });

        return res.status(200).json(populatedChats);
    } catch (error) {
        console.error("Error in fetchChats:", error.message);
        return res.status(500).json({ message: error.message });
    }
});

// Create a group chat
const createGroupChat = expressAsyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).json({ message: "Please enter all the fields" });
    }

    const users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res.status(400).json({ message: "More than 2 users required to form a group chat" });
    }

    users.push(req.user._id);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user._id,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");
        
        return res.status(200).json(fullGroupChat);
    } catch (error) {
        console.error("Error in createGroupChat:", error.message);
        return res.status(500).json({ message: error.message });
    }
});

// Rename a group chat
const renameGroup = expressAsyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    try {
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId, 
            { chatName },
            { new: true }
        )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

        if (!updatedChat) {
            return res.status(404).json({ message: "Chat Not Found" });
        }

        return res.status(200).json(updatedChat);
    } catch (error) {
        console.error("Error in renameGroup:", error.message);
        return res.status(500).json({ message: error.message });
    }
});

// Add user to a group chat
const addToGroup = expressAsyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    try {
        const added = await Chat.findByIdAndUpdate(
            chatId, 
            { $push: { users: userId } },
            { new: true }
        )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

        if (!added) {
            return res.status(404).json({ message: "Chat Not Found" });
        }

        return res.status(200).json(added);
    } catch (error) {
        console.error("Error in addToGroup:", error.message);
        return res.status(500).json({ message: error.message });
    }
});

// Remove user from a group chat
const removeFromGroup = expressAsyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    try {
        const removed = await Chat.findByIdAndUpdate(
            chatId, 
            { $pull: { users: userId } },
            { new: true }
        )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

        if (!removed) {
            return res.status(404).json({ message: "Chat Not Found" });
        }

        return res.status(200).json(removed);
    } catch (error) {
        console.error("Error in removeFromGroup:", error.message);
        return res.status(500).json({ message: error.message });
    }
});

module.exports = {
    accessChat,
    fetchChats,
    createGroupChat,
    renameGroup,
    addToGroup,
    removeFromGroup
};
