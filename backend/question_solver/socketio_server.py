"""
Socket.IO server for real-time pair quiz synchronization
"""
import socketio
import logging

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Store active connections
active_sessions = {}  # {session_id: {host_sid, partner_sid}}


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'sid': sid}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    
    # Find and notify session
    for session_id, participants in list(active_sessions.items()):
        if sid in participants.values():
            # Notify other participant
            other_sid = [s for s in participants.values() if s != sid][0] if len(participants) > 1 else None
            if other_sid:
                await sio.emit('partner_disconnected', {
                    'message': 'Your partner has disconnected'
                }, room=other_sid)
            
            # Remove session
            del active_sessions[session_id]
            break


@sio.event
async def join_session(sid, data):
    """Join a pair quiz session"""
    try:
        session_id = data.get('sessionId')
        user_id = data.get('userId')
        
        if not session_id or not user_id:
            await sio.emit('error', {'message': 'Invalid session data'}, room=sid)
            return
        
        # Get session from database
        try:
            session = await get_session(session_id)
        except Exception as e:
            await sio.emit('error', {'message': f'Session not found: {str(e)}'}, room=sid)
            return
        
        # Initialize session in memory
        if session_id not in active_sessions:
            active_sessions[session_id] = {}
        
        # Assign role based on user_id
        is_host = user_id == session['hostUserId']
        role = 'host' if is_host else 'partner'
        
        # Store connection
        connection_key = 'host_sid' if is_host else 'partner_sid'
        active_sessions[session_id][connection_key] = sid
        
        logger.info(f"User {user_id} joining as {role}, host={session['hostUserId']}, partner={session['partnerUserId']}")
        
        # Join Socket.IO room
        await sio.enter_room(sid, session_id)
        
        # Notify user
        await sio.emit('session_joined', {
            'sessionId': session_id,
            'role': role,
            'session': session
        }, room=sid)
        
        # Check if both users have joined (check database, not just Socket.IO connections)
        if session['partnerUserId'] and session['partnerUserId'] != session['hostUserId']:
            # Both users joined - refresh session and broadcast
            logger.info(f"Both users connected to session {session_id}")
            session = await get_session(session_id)
            
            # Broadcast complete session data to all participants
            await sio.emit('partner_joined', {
                'message': 'Your partner has joined!',
                'session': session
            }, room=session_id)
            
            # Also emit state update for immediate synchronization
            await sio.emit('state_update', {
                'type': 'PARTNER_JOINED',
                'session': session
            }, room=session_id)
        
        logger.info(f"User {user_id} joined session {session_id} as {role}")
        
    except Exception as e:
        logger.error(f"Error joining session: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)


@sio.event
async def answer_selected(sid, data):
    """Handle answer selection"""
    try:
        session_id = data.get('sessionId')
        user_id = data.get('userId')
        question_index = data.get('questionIndex')
        selected_option = data.get('selectedOption')
        
        # Update session in database
        await update_answer(session_id, user_id, question_index, selected_option)
        
        # Broadcast to session room
        await sio.emit('state_update', {
            'type': 'ANSWER_SELECTED',
            'userId': user_id,
            'questionIndex': question_index,
            'selectedOption': selected_option
        }, room=session_id, skip_sid=sid)
        
        logger.info(f"Answer selected in session {session_id}: Q{question_index} = {selected_option}")
        
    except Exception as e:
        logger.error(f"Error handling answer selection: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)


@sio.event
async def next_question(sid, data):
    """Handle navigation to next question"""
    try:
        session_id = data.get('sessionId')
        question_index = data.get('questionIndex')
        
        # Update session in database
        await update_question_index(session_id, question_index)
        
        # Broadcast to session room
        await sio.emit('state_update', {
            'type': 'NEXT_QUESTION',
            'questionIndex': question_index
        }, room=session_id, skip_sid=sid)
        
        logger.info(f"Next question in session {session_id}: Q{question_index}")
        
    except Exception as e:
        logger.error(f"Error handling next question: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)


@sio.event
async def quiz_complete(sid, data):
    """Handle quiz completion"""
    try:
        session_id = data.get('sessionId')
        user_id = data.get('userId')
        score = data.get('score')
        time_taken = data.get('timeTaken')
        
        # Update session in database
        await complete_quiz(session_id, user_id, score, time_taken)
        
        # Check if both users completed
        session = await get_session(session_id)
        both_completed = session.get('hostScore') is not None and session.get('partnerScore') is not None
        
        # Broadcast to session room
        await sio.emit('state_update', {
            'type': 'QUIZ_COMPLETE',
            'userId': user_id,
            'score': score,
            'bothCompleted': both_completed,
            'session': session if both_completed else None
        }, room=session_id)
        
        logger.info(f"Quiz completed in session {session_id} by {user_id}: {score}")
        
    except Exception as e:
        logger.error(f"Error handling quiz completion: {str(e)}")
        await sio.emit('error', {'message': str(e)}, room=sid)


@sio.event
async def update_timer(sid, data):
    """Handle timer updates"""
    try:
        session_id = data.get('sessionId')
        timer_seconds = data.get('timerSeconds')
        
        # Update session in database
        await update_session_timer(session_id, timer_seconds)
        
        # Broadcast to session room
        await sio.emit('state_update', {
            'type': 'TIMER_UPDATE',
            'timerSeconds': timer_seconds
        }, room=session_id, skip_sid=sid)
        
    except Exception as e:
        logger.error(f"Error handling timer update: {str(e)}")


@sio.event
async def cancel_session(sid, data):
    """Handle session cancellation"""
    try:
        session_id = data.get('sessionId')
        reason = data.get('reason', 'User cancelled')
        
        # Update session in database
        await cancel_session_db(session_id, reason)
        
        # Broadcast to session room
        await sio.emit('state_update', {
            'type': 'SESSION_CANCELLED',
            'reason': reason
        }, room=session_id)
        
        # Clean up
        if session_id in active_sessions:
            del active_sessions[session_id]
        
        logger.info(f"Session {session_id} cancelled: {reason}")
        
    except Exception as e:
        logger.error(f"Error handling session cancellation: {str(e)}")


# Database helper functions (async wrappers)
async def get_session(session_id):
    """Get session from database"""
    from asgiref.sync import sync_to_async
    from .models import PairQuizSession
    
    @sync_to_async
    def _get():
        session = PairQuizSession.objects.get(id=session_id)
        data = {
            'sessionId': str(session.id),
            'sessionCode': session.session_code,
            'status': session.status,
            'hostUserId': session.host_user_id,
            'partnerUserId': session.partner_user_id,
            'quizConfig': session.quiz_config,
            'questions': session.questions or [],
            'currentQuestionIndex': session.current_question_index,
            'hostAnswers': session.host_answers or {},
            'partnerAnswers': session.partner_answers or {},
            'timerSeconds': session.timer_seconds,
            'hostScore': session.host_score,
            'partnerScore': session.partner_score
        }
        logger.info(f"Retrieved session {session_id}: status={data['status']}, questions={len(data['questions'])}")
        return data
    
    return await _get()


async def update_answer(session_id, user_id, question_index, selected_option):
    """Update answer in database"""
    from asgiref.sync import sync_to_async
    from .models import PairQuizSession
    
    @sync_to_async
    def _update():
        session = PairQuizSession.objects.get(id=session_id)
        if user_id == session.host_user_id:
            session.host_answers[str(question_index)] = selected_option
        else:
            session.partner_answers[str(question_index)] = selected_option
        session.save()
    
    await _update()


async def update_question_index(session_id, question_index):
    """Update current question index"""
    from asgiref.sync import sync_to_async
    from .models import PairQuizSession
    
    @sync_to_async
    def _update():
        session = PairQuizSession.objects.get(id=session_id)
        session.current_question_index = question_index
        session.save()
    
    await _update()


async def complete_quiz(session_id, user_id, score, time_taken):
    """Mark quiz as completed for user"""
    from asgiref.sync import sync_to_async
    from .models import PairQuizSession
    from django.utils import timezone
    
    @sync_to_async
    def _complete():
        session = PairQuizSession.objects.get(id=session_id)
        if user_id == session.host_user_id:
            session.host_score = score
            session.host_time_taken = time_taken
        else:
            session.partner_score = score
            session.partner_time_taken = time_taken
        
        # Mark as completed if both finished
        if session.host_score is not None and session.partner_score is not None:
            session.status = 'completed'
            session.completed_at = timezone.now()
        
        session.save()
    
    await _complete()


async def update_session_timer(session_id, timer_seconds):
    """Update session timer"""
    from asgiref.sync import sync_to_async
    from .models import PairQuizSession
    
    @sync_to_async
    def _update():
        session = PairQuizSession.objects.get(id=session_id)
        session.timer_seconds = timer_seconds
        session.save()
    
    await _update()


async def cancel_session_db(session_id, reason):
    """Cancel session in database"""
    from asgiref.sync import sync_to_async
    from .models import PairQuizSession
    from django.utils import timezone
    
    @sync_to_async
    def _cancel():
        session = PairQuizSession.objects.get(id=session_id)
        session.status = 'cancelled'
        session.completed_at = timezone.now()
        session.save()
    
    await _cancel()
