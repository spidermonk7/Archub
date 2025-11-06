import sys
import os
import re
from typing import Any, Dict, List, Tuple

# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from Messages.simpleMessage import SimpleMessage, SimpleMessageCreator
from Nodes.base_node import BaseNode
from camel.agents import ChatAgent
from artifact_manager import register_artifact



class AgentNode(BaseNode):
    """A Node that utilizes a Camel Chat Agent for processing."""

    def __init__(self, name: str, 
                 model_name: str = "gpt-4o-mini", 
                 system_prompt: str = "You are a helpful assistant.", 
                 tools: list = [], 
                 agent_resume = "An AI agent designed to assist with various tasks.", 
                 id = None,
                 emit=None,
                 run_id: str | None = None,
                 team_id: str | None = None,
                 ):
        super().__init__(name, id, emit=emit, run_id=run_id, team_id=team_id)
        self.type = "Chat_Agent-Node"
        self.model_name = model_name  
        self.system_prompt = system_prompt


        self.agent = ChatAgent(
            model=self.model_name,
            system_message=self.system_prompt,
            tools=tools, 
        )
        self.resume_info = agent_resume

    ARTIFACT_PATTERN = re.compile(r"\[\[artifact:(?P<path>[^|\]]+)(?:\|(?P<name>[^|\]]*))?(?:\|(?P<mime>[^|\]]*))?\]\]")


    def parse_received(self, data: SimpleMessage): 
        if isinstance(data, SimpleMessage):
            return data.to_str()
        elif isinstance(data, list):
            combined_content = "\n".join([msg.to_str() for msg in data if isinstance(msg, SimpleMessage)])
            return combined_content
    
    @staticmethod
    def _format_bytes(size: Any) -> str:
        try:
            value = float(size)
        except (TypeError, ValueError):
            return "unknown size"
        units = ["B", "KB", "MB", "GB", "TB"]
        index = 0
        while value >= 1024 and index < len(units) - 1:
            value /= 1024
            index += 1
        if index == 0:
            return f"{int(value)} {units[index]}"
        return f"{value:.1f} {units[index]}"

    def _format_attachments_for_prompt(self, attachments: List[Dict[str, Any]]) -> str:
        if not attachments:
            return ""
        lines = ["[Attached Files]"]
        for idx, attachment in enumerate(attachments, 1):
            name = attachment.get("displayName") or attachment.get("fileName") or f"Attachment {idx}"
            file_id = attachment.get("fileId") or attachment.get("id") or "unknown-id"
            mime = attachment.get("mimeType") or "application/octet-stream"
            size_text = self._format_bytes(attachment.get("sizeBytes") or attachment.get("size"))
            path_hint = attachment.get("storagePath") or attachment.get("storageUri") or attachment.get("path")
            download_hint = attachment.get("downloadUrl")
            lines.append(f"{idx}. {name} (id={file_id}, mime={mime}, size={size_text})")
            if path_hint:
                lines.append(f"   path: {path_hint}")
            if download_hint:
                lines.append(f"   url: {download_hint}")
        lines.append("Use the provided file identifiers or paths to access the files when needed.")
        return "\n".join(lines)

    def _compose_prompt(self, base_text: str, attachments: List[Dict[str, Any]]) -> str:
        attachment_section = self._format_attachments_for_prompt(attachments)
        if not attachment_section:
            return base_text
        return f"{base_text}\n\n{attachment_section}\n"

    def _extract_artifacts_from_output(self, text: Any) -> Tuple[str, List[Dict[str, Any]]]:
        """Scan processed text for artifact markers and register files."""
        attachments: List[Dict[str, Any]] = []
        if not isinstance(text, str):
            return "", attachments

        def _replacement(match: re.Match) -> str:
            raw_path = match.group("path").strip()
            display = (match.group("name") or "").strip() or os.path.basename(raw_path)
            mime = (match.group("mime") or "").strip() or None
            try:
                stored = register_artifact(
                    raw_path,
                    display_name=display,
                    mime_type=mime,
                    uploader=self.name,
                    team_id=self.team_id,
                    run_id=self.run_id,
                )
                attachments.append(stored)
                label = stored.get("displayName") or stored.get("fileName") or display
                return f"[生成文件: {label}]"
            except Exception as exc:
                print(f"⚠️ Failed to register artifact '{raw_path}': {exc}")
                return f"[附件注册失败: {raw_path}]"

        updated_text = self.ARTIFACT_PATTERN.sub(_replacement, text)
        return updated_text, attachments


    def receive(self, input_data: SimpleMessage):
        """Receive input data or messages."""
        self.received.extend([input_data] if not isinstance(input_data, list) else input_data)
       

    def process(self):
        """Process the received data using the LLM."""
        if not self.received:
            print(f"{self.name} has no data to process.")
            return

        # Emit start once per processing call when there is input
        try:
            self.emit({
                'type': 'node.processing.started',
                'runId': self.run_id,
                'teamId': self.team_id,
                'node': {'id': self.id, 'name': self.name},
                'meta': {'receivedCount': len(self.received)},
            })
        except Exception:
            pass

        for message in self.received:
            attachments = getattr(message, 'attachments', []) if hasattr(message, 'attachments') else []
            data = self.parse_received(message)
            payload = self._compose_prompt(data, attachments)
            try:
                print(f"[ATTENTION!]Node {self.type}-{self.name} with model {self.model_name} processing data: \n{payload}")
                processed_data = self.agent.step(payload).msgs[0].content
            except Exception as e:
                print(f"Node {self.type}-{self.name} with model {self.model_name} processing error: {e}")
                processed_data = None
            processed_text = self.parse_processed(processed_data)
            processed_text, generated_attachments = self._extract_artifacts_from_output(processed_text)
            processed_data = SimpleMessageCreator().create_message(
                content=processed_text,
                maker=self.name,
                target_agent='stage_manager',
                attachments=generated_attachments if generated_attachments else None,
            )
            self.processed.append(processed_data)
            print(f"[SUCCESS!]Node {self.type}-{self.name} with model {self.model_name} finished processing data.")
            print(f"Processed data: \n{processed_data.content}")

        # Emit finished once after completing processing of all inputs
        try:
            self.emit({
                'type': 'node.processing.finished',
                'runId': self.run_id,
                'teamId': self.team_id,
                'node': {'id': self.id, 'name': self.name},
                'messages': [{
                    'maker': getattr(m, 'maker', None),
                    'target': getattr(m, 'target_agent', None),
                    'timetag': getattr(m, 'timetag', None),
                    'preview': (getattr(m, 'content', '') or '')[:120],
                    'attachments': getattr(m, 'attachments', []),
                } for m in self.processed[-len(self.received):] if self.received],
                'meta': {'producedCount': len(self.processed)},
            })
        except Exception:
            pass


    def show(self):
        """Display or visualize the node's state."""
        print(f"Node Name: {self.name}")
        print(f"Node Type: {self.type}")
        print(f"LLM Model: {self.model_name}")
        print(f"Received Data: {self.received}")
        print(f"Processed Data: {self.processed}")

    def reset(self,):
        """Reset the node's state."""
        super().reset()
       
    def reset_agent(self,):
        """Reset the agent state, but keep the history."""
        self.agent.reset()
     

