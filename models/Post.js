// models/Post.js

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        
    },
    likes: {
        type: Number,
        default: 0,
        
    },
    comments: [{
        text: {
            type: String,
            required: [true, 'Comment text is required'],
            },
    }],
}, {
    timestamps: true, 
   
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
