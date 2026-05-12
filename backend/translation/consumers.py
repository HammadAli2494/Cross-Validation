from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class CallConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"call_{self.room_id}"
        query = parse_qs(self.scope.get("query_string", b"").decode())
        self.peer_id = query.get("peer", ["anonymous"])[0]

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_message",
                "message": {
                    "type": "peer-joined",
                    "peerId": self.peer_id,
                },
                "sender": self.peer_id,
            },
        )

    async def disconnect(self, _close_code):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_message",
                "message": {
                    "type": "peer-left",
                    "peerId": self.peer_id,
                },
                "sender": self.peer_id,
            },
        )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **_kwargs):
        message_type = content.get("type")
        if message_type not in {"offer", "answer", "ice-candidate", "transcript", "peer-ready"}:
            await self.send_json({"type": "error", "message": f"Unsupported message type: {message_type}"})
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_message",
                "message": content,
                "sender": self.peer_id,
            },
        )

    async def broadcast_message(self, event):
        if event["sender"] == self.peer_id:
            return

        await self.send_json(event["message"])
