import express from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection.js';
import { verifyFirebaseToken } from '../middleware/firebaseAuth.js';

const router = express.Router();

// Get all upcoming events with filtering
router.get('/upcoming', async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const { eventType, search } = req.query;
    let query = { eventDate: { $gte: new Date() } };

    // Filter by event type
    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const events = await eventsCollection
      .find(query)
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

    // Validation
    if (!title || !description || !eventType || !thumbnail || !location || !eventDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Date validation
    if (new Date(eventDate) <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Event date must be in the future' 
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
      creatorPhoto: req.user.picture || '',
      createdAt: new Date(),
      participants: [],
      participantCount: 0,
      updatedAt: new Date()
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

    // Check if event exists
    const event = await eventsCollection.findOne({ 
      _id: new ObjectId(eventId) 
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Check if user already joined
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
      userPhoto: user.picture || '',
      joinedAt: new Date()
    };

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { 
        $push: { participants: participantData },
        $inc: { participantCount: 1 },
        $set: { updatedAt: new Date() }
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

// Get user's created events (protected)
router.get('/user/created', verifyFirebaseToken, async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const events = await eventsCollection
      .find({ creatorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching your events' 
    });
  }
});

// Get user's joined events (protected)
router.get('/user/joined', verifyFirebaseToken, async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const events = await eventsCollection
      .find({ 
        'participants.userEmail': req.user.email 
      })
      .sort({ eventDate: 1 })
      .toArray();

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get joined events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching joined events' 
    });
  }
});

// Update event (protected - creator only)
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const db = getDatabase();
    const eventsCollection = db.collection('events');
    
    const eventId = req.params.id;
    const updateData = req.body;

    // Check if event exists and user is creator
    const event = await eventsCollection.findOne({ 
      _id: new ObjectId(eventId) 
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    if (event.creatorEmail !== req.user.email) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own events' 
      });
    }

    // Remove fields that shouldn't be updated
    const { _id, creatorEmail, creatorName, createdAt, participants, participantCount, ...validUpdateData } = updateData;
    
    // Add updated timestamp
    validUpdateData.updatedAt = new Date();

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: validUpdateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No changes made to the event' 
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating event' 
    });
  }
});

export default router;