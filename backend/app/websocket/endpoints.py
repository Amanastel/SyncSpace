from fastapi import WebSocket, WebSocketDisconnect, Query
import json
import logging
from app.websocket.connection_manager import manager, get_websocket_user

logger = logging.getLogger(__name__)


async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """Main WebSocket endpoint for real-time messaging"""
    
    # Authenticate user
    user = await get_websocket_user(websocket, token)
    if not user:
        return
    
    # Connect user
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                await manager.handle_message(websocket, message_data)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user.id}")
            except Exception as e:
                logger.error(f"Error handling message from user {user.id}: {e}")
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        await manager.disconnect(websocket)
