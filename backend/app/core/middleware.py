import json
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.services.audit_service import audit_service
from app.core.security import verify_token
import logging

class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path.startswith(("/docs", "/openapi.json", "/api/health")):
            return await call_next(request)

        # Try to get user_id from token
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                payload = verify_token(token)
                if payload:
                    user_id = payload.get("sub")
            except:
                pass

        # Capture Request Body
        req_body = b""
        try:
            req_body = await request.body()
            # Need to put the body back so the route handlers can read it
            received_body = False
            async def receive():
                nonlocal received_body
                if not received_body:
                    received_body = True
                    return {"type": "http.request", "body": req_body, "more_body": False}
                return {"type": "http.request", "body": b"", "more_body": False}
            request._receive = receive
        except Exception:
            pass
            
        req_data = None
        if req_body:
            try:
                req_data = json.loads(req_body.decode())
            except:
                req_data = {"raw": repr(req_body)}

        # Also get query params and headers
        req_details = {
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "body": req_data,
            "client": request.client.host if request.client else None
        }

        # Process the request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log the error
            await audit_service.log_activity(
                action="API_ERROR",
                entity_type="SYSTEM",
                details=f"{request.method} {request.url.path} failed: {str(e)}",
                user_id=user_id,
                request_data=req_details,
                response_data={"error": str(e)}
            )
            # Re-raise the exception to let global handlers deal with it
            raise

        # Read the response body
        res_body = b""
        res_data = None
        
        # We cannot easily read response body directly from the streaming response 
        # without consuming it but let's try a hack if it's a JSONResponse
        # A safer approach is to read the chunks, keep them, and return a new response
        
        from starlette.responses import StreamingResponse
        
        response_body = [section async for section in response.__dict__['body_iterator']]
        response.__setattr__('body_iterator', _iterator(response_body))
        
        try:
            res_content = b''.join(response_body)
            # do not log massive responses
            if len(res_content) < 100000:
                res_data = json.loads(res_content.decode())
            else:
                res_data = {"message": "response too large to log"}
        except:
            res_data = {"raw": "binary or non-json data"}
            
        res_details = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": res_data
        }

        await audit_service.log_activity(
            action=f"API_CALL: {request.method} {request.url.path}",
            entity_type="API",
            details=f"Status: {response.status_code}",
            user_id=user_id,
            request_data=req_details,
            response_data=res_details,
            ip_address=request.client.host if request.client else None
        )

        return response

async def _iterator(content_list):
    for chunk in content_list:
        yield chunk