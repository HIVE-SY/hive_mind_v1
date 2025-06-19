import express from 'express';
import path from 'path';

const router = express.Router();

// Landing page
router.get('/', (req, res) => {
    res.render('landing', {
        title: 'HIVE VOX | Intelligent Meeting Transcription',
        description: 'AI-powered meeting transcription that builds your organization\'s collective intelligence network.'
    });
});

// Dashboard
router.get('/dashboard', (req, res) => {
    // TODO: Get conversations from database
    const conversations = [
        {
            id: 1,
            title: 'Team Meeting',
            status: 'completed',
            created_at: new Date()
        },
        {
            id: 2,
            title: 'Project Review',
            status: 'in_progress',
            created_at: new Date()
        }
    ];
    
    res.render('dashboard', {
        title: 'Dashboard - HIVE VOX',
        conversations: conversations
    });
});

// Upload page
router.get('/upload', (req, res) => {
    res.render('upload', {
        title: 'Upload - HIVE VOX'
    });
});

// Record page
router.get('/record', (req, res) => {
    res.render('record', {
        title: 'Record - HIVE VOX'
    });
});

// Conversation details
router.get('/conversation/:id', (req, res) => {
    // TODO: Get conversation details from database
    res.render('conversation', {
        title: 'Conversation Details - HIVE VOX',
        conversationId: req.params.id,
        conversation: {
            id: req.params.id,
            title: 'Sample Conversation',
            status: 'completed',
            created_at: new Date(),
            transcript: 'Sample transcript...'
        }
    });
});

export default router; 