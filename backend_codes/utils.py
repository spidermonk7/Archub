import openai
from jinja2 import Template
import os
import yaml
from typing import Dict, Any
import json

def raw_LLM_response(prompt, model="gpt-4o-mini", temperature=0.7, max_tokens=150, system_message = None):
    response = openai.chat.completions.create(
        model=model,
        messages=[
            {'role': 'system', 'content': system_message} if system_message else {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        n=1,
        stop=None,
    )
    return response.choices[0].message.content.strip()


def load_prompt_from_template(template_path, params):
    try:
        with open(template_path, 'r', encoding='utf-8') as file:
            template_content = file.read()
    except UnicodeDecodeError:
        try:
            with open(template_path, 'r', encoding='gbk') as file:
                template_content = file.read()
        except UnicodeDecodeError:
            with open(template_path, 'r', encoding='latin-1') as file:
                template_content = file.read()
    
    template = Template(template_content)
    prompt = template.render(params)
    return prompt


def raw_LLM_validator(question, response, target, model="gpt-4o"):
    params = {
        "question": question,
        "target": target,
        "response": response
    }

    prompt = load_prompt_from_template("prompts/validator.md", params)
    response = raw_LLM_response(prompt, model=model)
    response = parse_json_from_str(response)

    return response['grade']






def save_record_safely(record, file_path):
    """Safely save a record to JSON file with proper error handling."""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(f"Record saved to {file_path}")
        return True
    except Exception as e:
        print(f"Error saving record to {file_path}: {e}")
        return False

def load_existing_records(log_file_path):
    """Load existing records and return set of tested question indices."""
    tested_indices = set()
    if os.path.exists(log_file_path):
        try:
            with open(log_file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                if line.strip():
                    try:
                        record = json.loads(line.strip())
                        if 'question' in record:
                            tested_indices.add(record['question'])
                    except json.JSONDecodeError as e:
                        print(f"Warning: Skipping malformed JSON on line {line_num}: {e}")
                        continue
        except Exception as e:
            print(f"Error loading existing records: {e}")
    
    return tested_indices




def load_agent_config(config_path: str) -> Dict[str, Any]:
    """
    从 agent_prompts/pools/{agent_name}.yaml 加载 Agent 配置。
    返回字段: name, model, tools, meta, system, resume
    """
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"❌ Agent config not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # 校验字段存在性并提供默认值
    return {
        "name": config.get("name", "Unnamed Agent"),
        "model": config.get("model", "gpt-4o-mini"),
        "tools": config.get("tools", []),
        "meta": config.get("meta", {}),
        "system": config.get("system", ""),
        "resume": config.get("resume", "")
    }

def parse_json_from_str(output_str):
    output_str = output_str.strip().replace('```json', '').replace('```', '')

    return yaml.safe_load(output_str)


def calculate_f1_score(predicted, actual):
    """Calculate F1 score between predicted and actual answers."""
    if not predicted or not actual:
        return 0.0
    
    # Convert to lowercase and split into words
    pred_words = set(predicted.lower().split())
    actual_words = set(actual.lower().split())
    
    # Calculate precision and recall
    if len(pred_words) == 0:
        return 0.0
    
    intersection = pred_words.intersection(actual_words)
    precision = len(intersection) / len(pred_words)
    recall = len(intersection) / len(actual_words) if len(actual_words) > 0 else 0
    
    # Calculate F1 score
    if precision + recall == 0:
        return 0.0
    
    f1 = 2 * (precision * recall) / (precision + recall)
    return f1


def calculate_partial_match(predicted, actual):
    """Calculate Partial Match score between predicted and actual answers."""
    if not predicted or not actual:
        return 0.0
    
    predicted_lower = predicted.lower().strip()
    actual_lower = actual.lower().strip()
    
    # Exact match
    if predicted_lower == actual_lower:
        return 1.0
    
    # Check if predicted contains actual or vice versa
    if actual_lower in predicted_lower or predicted_lower in actual_lower:
        return 1.0
    
    # Check word overlap
    pred_words = set(predicted_lower.split())
    actual_words = set(actual_lower.split())
    
    if len(actual_words) == 0:
        return 0.0
    
    # Calculate word overlap ratio
    intersection = pred_words.intersection(actual_words)
    overlap_ratio = len(intersection) / len(actual_words)
    
    # Consider it a partial match if overlap is > 50%
    return 1.0 if overlap_ratio > 0.5 else 0.0


def parse_team(team_info):

    parsed_info = ""
    for key, value in team_info.items():
        parsed_info += f"## Processor Agent: {key}\n{value}\n"

    return parsed_info



if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    # Example usage
    question = "Who scored the winning goal for the Netherlands in the 2010 FIFA World Cup quarter-final against Brazil?"
    response = "I couldn't find the information."
    target = "Wesley Sneijder"
    
    grade = raw_LLM_validator(question, response, target)
    print(f"Grade: {grade}")