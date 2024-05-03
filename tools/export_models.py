import os
import os.path
import re
import time
from collections import defaultdict
from itertools import takewhile
from typing import Any, Dict, List, Callable, Tuple, Optional

import requests
import urllib3
from requests import Response
from requests.adapters import HTTPAdapter
from urllib3.exceptions import InsecureRequestWarning
from urllib3.util import Retry

core = "https://localhost:8900"

# This list is used as filter: only providers listed here get exported
providers = [
    "aws",
    "azure",
    "digitalocean",
    "dockerhub",
    "gcp",
    "github",
    "kubernetes",
    "onelogin",
    "onprem",
    "posthog",
    "scarf",
    "slack",
    "vsphere",
]
urllib3.disable_warnings(InsecureRequestWarning)

base_kinds = ["access_key", "account", "autoscaling_group", "bucket", "certificate", "database", "dns_record",
              "dns_record_set", "dns_zone", "endpoint", "firewall", "gateway", "group", "health_check", "instance",
              "instance_profile", "instance_type", "ip_address", "keypair", "load_balancer",
              "managed_kubernetes_cluster_provider", "network", "network_acl", "network_interface", "network_share",
              "organizational_root", "organizational_unit", "peering_connection", "policy", "region", "role",
              "routing_table", "security_group", "serverless_function", "snapshot", "stack", "subnet", "tunnel", "type",
              "user", "volume", "volume_type", "zone"]


def get_url(url: str, params: dict = None) -> Response:
    session = requests.Session()
    adapter = HTTPAdapter(
        max_retries=Retry(
            total=3,
            backoff_factor=0.1,
        )
    )
    session.mount("https://", adapter)
    return session.get(url, params=params, verify=False)


def get_kinds() -> Tuple[Dict[str, Any], Dict[str, List[Any]]]:
    kinds = defaultdict(list)
    all_kinds: Dict[str, Any] = {}
    for kind in get_url(f"{core}/graph/fix/model").json():
        all_kinds[kind["fqn"]] = kind
        groups = [a for a in providers if kind["fqn"].startswith(f"{a}_") and kind.get("aggregate_root", False)]
        if groups:
            kinds[groups[0]].append(kind)

    return all_kinds, kinds


def write_md(provider: str,
             kinds: list,
             properties: Callable[[str], Dict[str, str]],
             relationship: Optional[Callable[[str], Dict[str, str]]] = None) -> None:
    # os.makedirs(f"./{provider}/img", exist_ok=True)  # make sure the provider directory exists
    if os.path.exists(f"./{provider}.mdx"):
        # in case the file exists, read the header section until the first h2 (##)
        with (open(f"./{provider}.mdx", "r+")) as file:
            lines = takewhile(lambda ll: not ll.startswith("## "), file.readlines())
    else:
        # provider file does not exist, create default header
        lines = [
            f"---\nsidebar_label: {provider.capitalize()}\n---\n\n",
            f"# {provider.capitalize()} Resource Data Models\n\n",
        ]

    with open(f"./{provider}.mdx", "w+") as file:
        for line in lines:
            file.write(line)

        for name in sorted(a["fqn"] for a in kinds):
            file.write(f"## `{name}`\n\n")
            file.write(f"<ZoomPanPinch>\n\n")
            file.write(f'```kroki imgType="plantuml" imgAlt="Diagram of {name} data model"\n')
            img_str = get_url(f"{core}/graph/fix/model/uml", params=properties(name)).text
            file.write(re.sub(r"\n+", "\n", img_str).strip())
            file.write("\n```\n\n")
            file.write("</ZoomPanPinch>\n")
            if relationship is not None:
                file.write(f"<details>\n<summary>Relationships to Other Resources</summary>\n<div>\n")
                file.write(
                    f'<ZoomPanPinch>\n\n```kroki imgType="plantuml" imgAlt="Diagram of {name} resource relationships"\n'
                )
                img_str = get_url(f"{core}/graph/fix/model/uml", params=relationship(name)).text
                file.write(re.sub(r"\n+", "\n", img_str).strip())
                file.write(f"\n```\n\n</ZoomPanPinch>\n</div>\n</details>\n\n")


def load_valid_kinds() -> Tuple[Dict[str, Any], Dict[str, List[Any]]]:
    for _ in range(30):  # number of retries
        try:
            print("Getting available kinds...")
            all_kinds, kinds = get_kinds()
            if all_kinds and kinds:
                return all_kinds, kinds
            else:
                print(f"Retrying in 5 seconds...")
        except Exception as ex:
            print(f"Error getting list of kinds: {ex}")
        time.sleep(5)
    raise ValueError("Could not load kinds!")


def export() -> None:
    def class_diagram(name: str) -> Dict[str, str]:
        return dict(output="puml", show=name, sort_props="true")

    def relationship_diagram(name: str) -> Dict[str, str]:
        return dict(
            dependency="default",
            output="puml",
            show=name,
            sort_props="true",
            with_base_classes="false",
            with_inheritance="false",
            with_predecessors="true",
            with_properties="false",
            with_subclasses="false",
            with_successors="true",
        )

    def show_base_diagram(name: str) -> Dict[str, str]:
        return dict(
            hide="random_.*,example_.*,unknown_.*",
            output="puml",
            show=name,
            sort_props="true",
            with_base_classes="true",
            with_inheritance="true",
            with_properties=f"({name})|(resource)",
            with_subclasses="true",
        )

    all_kinds, kinds = load_valid_kinds()
    print(f"Create base kinds")
    write_md("unified_resources", [all_kinds[bk] for bk in base_kinds if bk in all_kinds], show_base_diagram)
    for provider in providers:
        if len(kinds.get(provider, [])) > 0:
            print("---------------------------")
            print(f"Create provider file: {provider} with {len(kinds[provider])} service kinds")
            write_md(provider, kinds[provider], class_diagram, relationship_diagram)


export()
