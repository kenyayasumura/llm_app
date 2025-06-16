from typing import Dict, Any, List, Optional
from services.generative_ai_service import GenerativeAIService
import json
import time
from datetime import datetime
import logging

# ロガーの設定
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('AgentService')

class AgentService:
    def __init__(self, debug: bool = False):
        self.ai_service = GenerativeAIService()
        self.max_iterations = 2  # 最大実行回数を2回に制限
        self.max_improvement_cycles = 2  # 改善サイクルの最大回数
        self.timeout_seconds = 300  # タイムアウト（5分）
        self.min_success_rate = 0.7  # 最低成功率
        self.debug = debug
        # TODO:　品質確認用のペルソナをUIから入力できるようにする
        self.quality_check_personas = {
            "technical_expert": {
                "role": "技術的な正確性と詳細を確認する専門家",
                "focus_areas": ["技術的な正確性", "実装の詳細", "ベストプラクティス"],
                "evaluation_criteria": ["技術的な正確性", "実装の詳細", "ベストプラクティス"]
            },
            "user_experience": {
                "role": "ユーザー体験の観点から評価する専門家",
                "focus_areas": ["使いやすさ", "理解しやすさ", "ユーザーフレンドリー"],
                "evaluation_criteria": ["使いやすさ", "理解しやすさ", "ユーザーフレンドリー"]
            },
            "business_analyst": {
                "role": "ビジネス価値と実用性を評価する専門家",
                "focus_areas": ["ビジネス価値", "実用性", "ROI"],
                "evaluation_criteria": ["ビジネス価値", "実用性", "ROI"]
            },
            "summarizer": {
                "role": "実行結果を分析し、分かりやすくまとめる専門家",
                "focus_areas": ["全体の概要", "重要なポイント", "次のステップ", "補足情報"],
                "evaluation_criteria": ["全体の概要", "重要なポイント", "次のステップ", "補足情報"]
            }
        }

    async def execute_agent(self, goal: str, constraints: List[str], capabilities: Dict[str, bool], behavior: Dict[str, float], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        エージェントを実行し、タスクの計画と実行を行う
        """
        if self.debug:
            logger.debug(f"エージェント実行開始: goal={goal}, constraints={constraints}, capabilities={capabilities}, behavior={behavior}, context={context}")

        start_time = time.time()
        iteration = 0
        improvement_cycle = 0  # 改善サイクルのカウンター
        execution_log = []
        best_success_rate = 0.0
        current_content = ""

        # 初期ステータスを返す
        yield {
            'status': 'running',
            'execution_log': [{
                'step': 'initialization',
                'result': 'エージェントの初期化を開始',
                'timestamp': datetime.now().isoformat()
            }]
        }

        while True:
            # タイムアウトチェック
            if time.time() - start_time > self.timeout_seconds:
                if self.debug:
                    logger.warning(f"タイムアウト: {self.timeout_seconds}秒を超過")
                yield {
                    'status': 'timeout',
                    'execution_log': execution_log,
                    'iteration': iteration,
                    'improvement_cycle': improvement_cycle,
                    'best_success_rate': best_success_rate,
                    'error': f'タイムアウト: {self.timeout_seconds}秒を超過'
                }
                return

            # 最大実行回数チェック
            if iteration >= self.max_iterations:
                if self.debug:
                    logger.warning(f"最大実行回数に達しました: {self.max_iterations}回")
                yield {
                    'status': 'max_iterations',
                    'execution_log': execution_log,
                    'iteration': iteration,
                    'improvement_cycle': improvement_cycle,
                    'best_success_rate': best_success_rate,
                    'error': f'最大実行回数({self.max_iterations}回)に達しました'
                }
                return

            # 改善サイクルの制限チェック
            if improvement_cycle >= self.max_improvement_cycles:
                if self.debug:
                    logger.warning(f"最大改善サイクル数に達しました: {self.max_improvement_cycles}回")
                yield {
                    'status': 'max_improvement_cycles',
                    'execution_log': execution_log,
                    'iteration': iteration,
                    'improvement_cycle': improvement_cycle,
                    'best_success_rate': best_success_rate,
                    'error': f'最大改善サイクル数({self.max_improvement_cycles}回)に達しました'
                }
                return

            if self.debug:
                logger.debug(f"イテレーション {iteration + 1} 開始 (改善サイクル: {improvement_cycle + 1})")

            # 1. タスクの計画
            yield {
                'status': 'running',
                'execution_log': execution_log + [{
                    'step': 'planning',
                    'result': f'イテレーション {iteration + 1} の計画を作成中',
                    'timestamp': datetime.now().isoformat()
                }]
            }

            plan = self._create_plan(goal, constraints, capabilities, context)
            if self.debug:
                logger.debug(f"作成された計画: {json.dumps(plan, indent=2, ensure_ascii=False)}")
            
            # 2. 計画の実行
            for task in plan['tasks']:
                if self.debug:
                    logger.debug(f"タスク実行: {task['description']}")
                
                yield {
                    'status': 'running',
                    'execution_log': execution_log + [{
                        'step': 'task_execution',
                        'result': f'タスク実行中: {task["description"]}',
                        'timestamp': datetime.now().isoformat()
                    }]
                }

                result = self._execute_task(task, context)
                if self.debug:
                    logger.debug(f"タスク実行結果: {json.dumps(result, indent=2, ensure_ascii=False)}")

                execution_log.append({
                    'iteration': iteration,
                    'task': task['description'],
                    'result': result['output'],
                    'status': result['status'],
                    'timestamp': datetime.now().isoformat()
                })
                
                if result['status'] == 'success':
                    current_content = result['output']

            # 3. 品質チェック
            if current_content:
                yield {
                    'status': 'running',
                    'execution_log': execution_log + [{
                        'step': 'quality_check',
                        'result': '品質チェックを実行中',
                        'timestamp': datetime.now().isoformat()
                    }]
                }

                reviews = []
                for persona_name, persona in self.quality_check_personas.items():
                    review = self._get_persona_review(current_content, persona)
                    reviews.append({
                        'persona': persona_name,
                        'review': review
                    })
                    if self.debug:
                        logger.debug(f"{persona_name}のレビュー: {json.dumps(review, indent=2, ensure_ascii=False)}")

                # レビューの集約
                aggregated_review = self._aggregate_reviews(reviews)
                if self.debug:
                    logger.debug(f"集約されたレビュー: {json.dumps(aggregated_review, indent=2, ensure_ascii=False)}")

                # 成功率の更新
                current_success_rate = aggregated_review['overall_score']
                best_success_rate = max(best_success_rate, current_success_rate)

                # 成功率が閾値を超えた場合は早期終了
                if current_success_rate >= self.min_success_rate:
                    if self.debug:
                        logger.info(f"目標達成: 成功率 {current_success_rate:.2f} (改善サイクル: {improvement_cycle})")

                    # まとめ役のペルソナによる最終報告
                    summary = self._get_persona_review(current_content, self.quality_check_personas["summarizer"])
                    
                    yield {
                        'status': 'success',
                        'execution_log': execution_log,
                        'plan': plan,
                        'reviews': reviews,
                        'aggregated_review': aggregated_review,
                        'final_content': current_content,
                        'iteration': iteration,
                        'improvement_cycle': improvement_cycle,
                        'success_rate': current_success_rate,
                        'summary': summary
                    }
                    return

                # 改善の適用（成功率が閾値を下回る場合のみ）
                if aggregated_review['priority_improvements'] and current_success_rate < self.min_success_rate:
                    yield {
                        'status': 'running',
                        'execution_log': execution_log + [{
                            'step': 'improvement',
                            'result': f'改善を適用中 (サイクル {improvement_cycle + 1})',
                            'timestamp': datetime.now().isoformat()
                        }]
                    }

                    current_content = self._apply_improvements(current_content, aggregated_review['priority_improvements'])
                    improvement_cycle += 1  # 改善サイクルをカウントアップ
                    if self.debug:
                        logger.debug(f"改善適用後の内容 (サイクル {improvement_cycle}): {current_content}")

            iteration += 1

    def _create_plan(self, goal: str, constraints: List[str], capabilities: Dict[str, bool], context: Dict[str, Any]) -> Dict[str, Any]:
        """タスクの計画を作成"""
        prompt = f"""
目標: {goal}
制約条件: {', '.join(constraints)}
利用可能な機能: {', '.join(k for k, v in capabilities.items() if v)}
現在のコンテキスト: {context}

この目標を達成するための具体的なタスク計画を作成してください。
各タスクには以下の情報を含めてください：
- 説明
- 必要なリソース
- 依存関係
- 予想される結果

以下の形式でJSONを返してください：
{{
    "tasks": [
        {{
            "description": "タスクの説明",
            "resources": ["必要なリソース"],
            "dependencies": ["依存関係"],
            "expected_result": "予想される結果"
        }}
    ],
    "fallback_plans": ["代替計画"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _execute_task(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """個別のタスクを実行"""
        prompt = f"""
以下のタスクを実行してください：

タスク:
{json.dumps(task, indent=2, ensure_ascii=False)}

コンテキスト:
{json.dumps(context, indent=2, ensure_ascii=False)}

重要な制約事項：
1. 事実確認が必要な情報は、必ず「要確認」としてマークしてください
2. 不確実な情報は「推測」として明示してください
3. 情報源がある場合は必ず明記してください
4. 仮定に基づく判断は「仮定：」として明示してください
5. 実際に行った調査や実験は、具体的な手順と結果を記録してください
6. 行っていない調査や実験については、決して「行った」と記述しないでください

実行結果を以下の形式でJSONを返してください：
{{
    "status": "success" | "failure",
    "output": "実行結果",
    "error": "エラーメッセージ（失敗の場合）",
    "next_steps": ["次のステップ"],
    "assumptions": ["仮定のリスト"],
    "verification_needed": ["要確認の項目"],
    "sources": ["情報源のリスト"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _adjust_plan(self, plan: Dict[str, Any], result: Dict[str, Any], 
                    context: Dict[str, Any]) -> Dict[str, Any]:
        """計画の修正"""
        prompt = f"""
以下の計画を修正してください：

現在の計画:
{json.dumps(plan, indent=2, ensure_ascii=False)}

実行結果:
{json.dumps(result, indent=2, ensure_ascii=False)}

コンテキスト:
{json.dumps(context, indent=2, ensure_ascii=False)}

修正後の計画を以下の形式でJSONを返してください：
{{
    "tasks": [
        {{
            "description": "タスクの説明",
            "resources": ["必要なリソース"],
            "dependencies": ["依存関係"],
            "expected_result": "予想される結果"
        }}
    ],
    "fallback_plans": ["代替計画"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _review_execution(self, plan: Dict[str, Any], execution_log: List[dict],
                         goal: str, constraints: List[str]) -> Dict[str, Any]:
        """実行結果の評価"""
        prompt = f"""
以下の実行結果を評価してください：

実行計画:
{json.dumps(plan, indent=2, ensure_ascii=False)}

実行ログ:
{json.dumps(execution_log, indent=2, ensure_ascii=False)}

目標:
{goal}

制約条件:
{json.dumps(constraints, indent=2, ensure_ascii=False)}

評価結果を以下の形式でJSONを返してください：
{{
    "success_rate": 0.0-1.0,
    "achieved_goals": ["達成された目標"],
    "missed_goals": ["未達成の目標"],
    "constraint_violations": ["制約違反"],
    "improvements": ["改善提案"],
    "next_steps": ["次のステップ"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _parse_plan(self, response: str) -> Dict[str, Any]:
        """計画の解析"""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "tasks": [],
                "fallback_plans": []
            }

    def _parse_task_result(self, response: str) -> Dict[str, Any]:
        """タスク実行結果の解析"""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "status": "failure",
                "output": "",
                "error": "Invalid response format",
                "next_steps": []
            }

    def _parse_analysis(self, response: str) -> Dict[str, Any]:
        """分析結果の解析"""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "purpose": "",
                "goals": [],
                "node_roles": {},
                "risks": [],
                "resources": [],
                "constraints": [],
                "success_criteria": []
            }

    def _execute_node(self, node: dict) -> List[str]:
        """特定のノードを実行"""
        try:
            # ノードの種類に応じて実行
            if node['type'] == 'AGENT':
                return self.execute_agent(
                    goal=node['data']['goal'],
                    constraints=node['data']['constraints'],
                    capabilities=node['data']['capabilities'],
                    behavior=node['data']['behavior'],
                    context={}
                )
            elif node['type'] == 'GENERATIVE_AI':
                return [self.ai_service.generate_text(node['data']['prompt'])]
            elif node['type'] == 'FORMATTER':
                return [self._format_output(node['data'])]
            else:
                return [f"未対応のノードタイプ: {node['type']}"]
        except Exception as e:
            return [f"ノード実行エラー: {str(e)}"]

    def _format_output(self, data: Dict[str, Any]) -> str:
        """出力のフォーマット"""
        try:
            template = data.get('template', '')
            variables = data.get('variables', {})
            return template.format(**variables)
        except Exception as e:
            return f"フォーマットエラー: {str(e)}"

    def execute_workflow(self, workflow: Dict[str, Any]) -> List[str]:
        """
        エージェントがワークフローを実行
        """
        start_time = time.time()
        iteration = 0
        results = []
        best_success_rate = 0.0

        nodes = workflow['nodes']
        agent_config = workflow['agent_config']

        while True:
            # タイムアウトチェック
            if time.time() - start_time > self.timeout_seconds:
                results.append(f"タイムアウト: {self.timeout_seconds}秒を超過")
                return results

            # 最大実行回数チェック
            if iteration >= self.max_iterations:
                results.append(f"最大実行回数({self.max_iterations}回)に達しました")
                return results

            # 1. ワークフローの分析
            analysis = self._analyze_workflow(nodes, agent_config)
            
            # 2. 実行計画の作成
            plan = self._create_execution_plan(analysis, agent_config)
            
            # 3. 計画の実行
            iteration_results = []
            for step in plan['steps']:
                if step['type'] == 'execute_node':
                    node_results = self._execute_node(step['node'])
                    iteration_results.extend(node_results)
                elif step['type'] == 'web_search':
                    search_results = self._execute_web_search(step['query'])
                    iteration_results.append(f"検索結果: {search_results}")
                elif step['type'] == 'modify_workflow':
                    nodes = self._modify_workflow(nodes, step['modifications'])
                elif step['type'] == 'evaluate':
                    evaluation = self._evaluate_execution(iteration_results, step['criteria'])
                    current_success_rate = evaluation['success_rate']
                    best_success_rate = max(best_success_rate, current_success_rate)

                    if evaluation['should_stop']:
                        results.extend(iteration_results)
                        return results

                    if current_success_rate >= self.min_success_rate:
                        results.extend(iteration_results)
                        return results

            results.extend(iteration_results)
            iteration += 1

    def _analyze_workflow(self, nodes: List[dict], agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """ワークフローの分析"""
        prompt = f"""
以下のワークフローを分析し、実行計画を立てるために必要な情報を抽出してください。

ワークフロー:
{json.dumps(nodes, indent=2, ensure_ascii=False)}

エージェント設定:
{json.dumps(agent_config, indent=2, ensure_ascii=False)}

以下の観点で分析してください：
1. ワークフローの目的と目標
2. 各ノードの役割と依存関係
3. 潜在的なリスクと課題
4. 必要なリソースと制約
5. 成功基準と評価指標

以下の形式でJSONを返してください：
{{
    "purpose": "ワークフローの目的",
    "goals": ["目標のリスト"],
    "node_roles": {{
        "ノードID": "役割の説明"
    }},
    "risks": ["リスクのリスト"],
    "resources": ["必要なリソース"],
    "constraints": ["制約条件"],
    "success_criteria": ["成功基準"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _create_execution_plan(self, analysis: Dict[str, Any], 
                             agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """実行計画の作成"""
        prompt = f"""
以下の分析結果に基づいて、ワークフローの実行計画を作成してください。

分析結果:
{json.dumps(analysis, indent=2, ensure_ascii=False)}

エージェント設定:
{json.dumps(agent_config, indent=2, ensure_ascii=False)}

以下の形式でJSONを返してください：
{{
    "steps": [
        {{
            "type": "execute_node" | "web_search" | "modify_workflow" | "evaluate",
            "description": "ステップの説明",
            "node": {{...}},  // execute_nodeの場合
            "query": "検索クエリ",  // web_searchの場合
            "modifications": {{...}},  // modify_workflowの場合
            "criteria": {{...}}  // evaluateの場合
        }}
    ],
    "expected_outcomes": ["期待される結果"],
    "fallback_plans": ["代替計画"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _execute_web_search(self, query: str) -> str:
        """Web検索を実行"""
        return self.ai_service.web_search(query)

    def _modify_workflow(self, nodes: List[dict], 
                        modifications: Dict[str, Any]) -> List[dict]:
        """ワークフローの修正"""
        prompt = f"""
以下のワークフローを修正してください。

現在のワークフロー:
{json.dumps(nodes, indent=2, ensure_ascii=False)}

修正内容:
{json.dumps(modifications, indent=2, ensure_ascii=False)}

修正後のワークフローを以下の形式でJSONを返してください：
{{
    "nodes": [
        {{
            "id": "ノードID",
            "type": "ノードタイプ",
            "data": {{
                // ノードのデータ
            }},
            "position": {{
                "x": 数値,
                "y": 数値
            }}
        }}
    ],
    "edges": [
        {{
            "id": "エッジID",
            "source": "ソースノードID",
            "target": "ターゲットノードID"
        }}
    ]
}}
"""
        result = self.ai_service.generate_json(prompt)
        return result.get('nodes', nodes)

    def _evaluate_execution(self, results: List[str], 
                          criteria: Dict[str, Any]) -> Dict[str, Any]:
        """実行結果の評価"""
        prompt = f"""
以下の実行結果を評価してください。

実行結果:
{json.dumps(results, indent=2, ensure_ascii=False)}

評価基準:
{json.dumps(criteria, indent=2, ensure_ascii=False)}

評価結果を以下の形式でJSONを返してください：
{{
    "success_rate": 0.0-1.0,
    "issues": ["検出された問題"],
    "improvements": ["改善提案"],
    "should_stop": true/false,
    "next_steps": ["次のステップ"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _get_persona_review(self, content: str, persona: dict) -> Dict[str, Any]:
        """特定のペルソナからのレビューを取得"""
        prompt = f"""
あなたは{persona['role']}です。
以下の内容を評価し、改善提案をしてください。

評価対象:
{content}

評価の観点:
{', '.join(persona['focus_areas'])}

評価基準：
1. 目的の達成度（0.0-1.0）
2. 制約条件の遵守度（0.0-1.0）
3. 品質基準の達成度（0.0-1.0）
4. 実現可能性（0.0-1.0）

重要な制約事項：
1. 実際に確認できた事実のみを評価してください
2. 推測や仮定に基づく評価は「推測：」として明示してください
3. 確認が必要な項目は「要確認」としてマークしてください
4. 具体的な根拠のない改善提案は避けてください
5. 実際に行った調査や実験は、具体的な手順と結果を記録してください

以下の形式でJSONを返してください：
{{
    "scores": {{
        "purpose_achievement": 0.0-1.0,
        "constraint_compliance": 0.0-1.0,
        "quality_standards": 0.0-1.0,
        "feasibility": 0.0-1.0
    }},
    "overall_score": 0.0-1.0,
    "strengths": ["確認済みの強み"],
    "weaknesses": ["確認済みの弱み"],
    "improvements": ["具体的な改善提案"],
    "priority": "high" | "medium" | "low",
    "verification_needed": ["要確認の項目"],
    "assumptions": ["仮定のリスト"]
}}
"""
        return self.ai_service.generate_json(prompt)

    def _aggregate_reviews(self, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """複数のレビューを集約"""
        prompt = f"""
以下の複数のレビューを集約し、総合的な評価と改善提案を作成してください。

レビュー:
{json.dumps(reviews, indent=2, ensure_ascii=False)}

評価基準の重み付け：
1. 目的の達成度: 40%
2. 制約条件の遵守度: 30%
3. 品質基準の達成度: 20%
4. 実現可能性: 10%

以下の形式でJSONを返してください：
{{
    "scores": {{
        "purpose_achievement": 0.0-1.0,
        "constraint_compliance": 0.0-1.0,
        "quality_standards": 0.0-1.0,
        "feasibility": 0.0-1.0
    }},
    "overall_score": 0.0-1.0,
    "key_strengths": ["主要な強み"],
    "key_weaknesses": ["主要な弱み"],
    "priority_improvements": ["優先度の高い改善提案"],
    "next_steps": ["次のステップ"],
    "score_breakdown": {{
        "purpose_achievement_weight": 0.4,
        "constraint_compliance_weight": 0.3,
        "quality_standards_weight": 0.2,
        "feasibility_weight": 0.1
    }}
}}
"""
        return self.ai_service.generate_json(prompt)

    def _apply_improvements(self, content: str, improvements: List[str]) -> str:
        """改善提案を適用"""
        prompt = f"""
以下の内容に改善提案を適用してください。

元の内容:
{content}

改善提案:
{json.dumps(improvements, indent=2, ensure_ascii=False)}

改善後の内容を返してください。
"""
        return self.ai_service.generate_text(prompt)