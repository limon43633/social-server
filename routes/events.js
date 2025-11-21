import express from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection.js';
import { verifyFirebaseToken } from '../middleware/firebaseAuth.js';

const router = express.Router();

// Get all upcoming events
router.get('/upcoming', async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const events = await eventsCollection
      .find({ eventDate: { $gte: new Date() } })
      .sort({ eventDate: 1 })
      .toArray();

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching events' 
    });
  }
});

// Get single event by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const event = await eventsCollection.findOne({ 
      _id: new ObjectId(req.params.id) 
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching event' 
    });
  }
});

// Create new event (protected)
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const { title, description, eventType, thumbnail, location, eventDate } = req.body;

    // Basic validation
    if (!title || !description || !eventType || !thumbnail || !location || !eventDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    const eventData = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      thumbnail: thumbnail.trim(),
      location: location.trim(),
      eventDate: new Date(eventDate),
      creatorEmail: req.user.email,
      creatorName: req.user.name,
      creatorPhoto: '',
      createdAt: new Date(),
      participants: [],
      participantCount: 0
    };

    const result = await eventsCollection.insertOne(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        _id: result.insertedId,
        ...eventData
      }
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating event' 
    });
  }
});

// Join event (protected)
router.post('/:id/join', verifyFirebaseToken, async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const eventId = req.params.id;
    const user = req.user;

    const event = await eventsCollection.findOne({ 
      _id: new ObjectId(eventId) 
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Check if already joined
    const alreadyJoined = event.participants.some(
      participant => participant.userEmail === user.email
    );

    if (alreadyJoined) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already joined this event' 
      });
    }

    const participantData = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.name,
      userPhoto: '',
      joinedAt: new Date()
    };

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { 
        $push: { participants: participantData },
        $inc: { participantCount: 1 }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to join event' 
      });
    }

    res.json({
      success: true,
      message: 'Successfully joined the event'
    });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error joining event' 
    });
  }
});

export default router;