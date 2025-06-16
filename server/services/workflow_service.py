from typing import Dict, List, Any, Set, Tuple
from collections import defaultdict, deque
from models import NodeType
from services.generative_ai_service import GenerativeAIService
from services.formatter_service import FormatterService

class WorkflowService:
    def __init__(self):
        self.ai_service = GenerativeAIService()
        self.formatter_service = FormatterService()
        self.node_results: Dict[str, Dict[str, Any]] = {}  # ノードID -> 出力データ
        self._cycle_cache: Dict[str, bool] = {}  # 循環チェックの結果をキャッシュ

    def _check_cycle(self, current_node: str, graph: Dict[str, List[str]], visited_in_path: set) -> bool:
        """
        指定されたノードから到達可能なノードをチェックし、循環参照の有無を判定

        Args:
            current_node: チェック対象のノードID
            graph: 依存関係グラフ
            visited_in_path: 現在のパスで訪問済みのノード集合

        Returns:
            bool: 循環参照が存在する場合はTrue
        """
        # キャッシュをチェック
        cache_key = f"{current_node}_{','.join(sorted(visited_in_path))}"
        if cache_key in self._cycle_cache:
            return self._cycle_cache[cache_key]

        if current_node in visited_in_path:
            self._cycle_cache[cache_key] = True
            return True

        visited_in_path.add(current_node)
        for next_node in graph[current_node]:
            if self._check_cycle(next_node, graph, visited_in_path):
                self._cycle_cache[cache_key] = True
                return True
        visited_in_path.remove(current_node)
        
        self._cycle_cache[cache_key] = False
        return False

    def _build_dependency_graph(self, nodes: List[dict]) -> Tuple[Dict[str, List[str]], Dict[str, int]]:
        """
        ノード間の依存関係を構築

        Returns:
            Tuple[Dict[str, List[str]], Dict[str, int]]: (グラフ, 入次数)
        """
        graph = defaultdict(list)
        in_degree = defaultdict(int)
        edge_cache = set()  # エッジの重複を防ぐためのキャッシュ

        # ノードIDからノードへのマッピングを作成
        node_map = {node['id']: node for node in nodes}

        for node in nodes:
            node_id = node['id']
            if 'edges' in node['config']:
                for edge in node['config']['edges']:
                    if edge['target'] == node_id:
                        source_id = edge['source']
                        # エッジの重複をチェック
                        edge_key = f"{source_id}->{node_id}"
                        if source_id in node_map and edge_key not in edge_cache:
                            edge_cache.add(edge_key)
                            graph[source_id].append(node_id)
                            in_degree[node_id] += 1

        return graph, in_degree

    def _get_execution_order(self, nodes: List[dict]) -> List[str]:
        """
         - トポロジカルソートで実行順序を決定
         - 循環参照をチェック
         - 循環参照がある場合、残りのノードを追加（※ただし、２回目までは許容してみた）
        """
        self._cycle_cache.clear()  # キャッシュをクリア
        graph = defaultdict(list)
        in_degree = defaultdict(int)

        # ノードのIDとconfig.node.idのマッピングを作成
        node_id_map = {node['config']['node']['id']: node['id'] for node in nodes}

        # エッジ情報から依存関係グラフを構築
        for node in nodes:
            if node['config'].get('edge'):
                edge = node['config']['edge']
                source_id = node_id_map[edge['source']]
                target_id = node_id_map[edge['target']]
                graph[source_id].append(target_id)
                in_degree[target_id] += 1

        # 初期ノードを効率的に取得
        initial_nodes = [node['id'] for node in nodes if in_degree[node['id']] == 0]
        queue = deque(initial_nodes)
        execution_order = []
        visit_count = defaultdict(int)
        processed_nodes = set()  # 処理済みノードを記録

        while queue:
            node_id = queue.popleft()
            if node_id in processed_nodes:
                continue

            visit_count[node_id] += 1
            processed_nodes.add(node_id)

            # 循環参照をチェック
            if visit_count[node_id] > 1:
                visited_in_path = set()
                if self._check_cycle(node_id, graph, visited_in_path):
                    print(f"警告: ノード {node_id} の2回目の処理は循環参照を引き起こすためスキップします")
                    continue

            execution_order.append(node_id)

            # 次のノードを効率的に追加
            for next_node in graph[node_id]:
                in_degree[next_node] -= 1
                if in_degree[next_node] == 0 and next_node not in processed_nodes:
                    queue.append(next_node)

        # 未処理のノードを効率的に追加
        remaining_nodes = [node['id'] for node in nodes if node['id'] not in processed_nodes]
        if remaining_nodes:
            print(f"警告: 以下のノードで循環参照が検出されました: {remaining_nodes}")
            execution_order.extend(remaining_nodes)

        return execution_order

    def _execute_node(self, node: dict) -> Dict[str, Any]:
        """個々のノードを実行"""
        node_type = node['node_type']
        config = node['config']

        if node_type == NodeType.EXTRACT_TEXT:
            prompt = f"""
こちらはユーザーがアップロードしたドキュメントです。
回答の参考にしてください。

ファイル名：
{config["file_name"]}
ファイルの内容：
{config["extract_text"]}
"""
            return {"text": prompt}

        elif node_type == NodeType.GENERATIVE_AI:
            prompt = f"""
こちらはユーザー入力した質問です。
できるだけ簡潔に回答してください。

質問：
{config["prompt"]}
"""
            generated_text = self.ai_service.generate_text(
                prompt=config["prompt"],
                model=config["model"],
                temperature=config["temperature"],
                max_tokens=config["max_tokens"]
            )
            return {"text": generated_text}

        elif node_type == NodeType.FORMATTER:
            previous_text = ""
            if self.node_results:
                last_node_id = list(self.node_results.keys())[-1]
                previous_text = self.node_results[last_node_id].get("text", "")

            formatted_text = self.formatter_service.format_text(
                previous_text,
                config
            )
            return {"text": formatted_text}

        else:
            raise ValueError(f"未知のノードタイプ: {node_type}")

    def execute(self, nodes: List[dict]) -> List[str]:
        """
        ワークフローを実行

        ### 計算量に関するメモ：
        V: ワークフロー内のノード数
        E: ノード間のエッジ（依存関係）の数

        ### 時間計算量: O(V + E)
        1. ノードマップの作成: O(V)
        2. 実行順序の取得: O(V + E)
        3. 各ノードの実行: O(V)（各ノードは1回だけ実行）
        => 全体の時間計算量は O(V + E) 

        ### 空間計算量は：
        1. グラフの保存: O(V + E)
        2. キャッシュ: O(V + E)
        3. その他の補助データ構造: O(V)
        => 全体の空間計算量も O(V + E) 
        """
        self.node_results.clear()
        execution_order = self._get_execution_order(nodes)

        node_map = {node['id']: node for node in nodes}
        results = []
        for node_id in execution_order:
            node = node_map[node_id]
            outputs = self._execute_node(node)
            self.node_results[node_id] = outputs
            results.append(outputs["text"])

        return results 