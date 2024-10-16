import os
import os.path
import shutil
import time
from collections import defaultdict
from dataclasses import dataclass
from itertools import takewhile
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import requests
import urllib3
from requests import Response
from requests.adapters import HTTPAdapter
from urllib3.exceptions import InsecureRequestWarning
from urllib3.util import Retry

urllib3.disable_warnings(InsecureRequestWarning)

core = "https://localhost:8900"
docs_dir = Path(__file__).resolve().parent.parent / 'docs' / 'reference' / 'unified-data-model'
# This list is used as filter: only sources listed here get exported
sources = [
    "base",
    "aws",
    "azure",
    "gcp",
    "digitalocean",
    "dockerhub",
    "github",
    "k8s",
    "onelogin",
    "onprem",
    "posthog",
    "scarf",
    "slack",
    "vsphere",
]
# This list is used to filter out unsupported sources from base kind diagrams
unsupported_providers = [
    "example",
    "random",
    "unknown",
]
known_categories = defaultdict(lambda: "Other",
    ai= "Machine Learning & AI",
    analytics= "Analytics",
    compute= "Compute",
    database= "Database",
    devops= "DevOps",
    dns= "DNS",
    access_control= "Access Control",
    managed_kubernetes= "Managed Kubernetes",
    management= "Management",
    misc= "Other",
    monitoring= "Monitoring",
    networking= "Networking",
    security= "Security",
    storage= "Storage",
)

@dataclass
class Metadata:
    categories: List[str]
    group: str
    description: str
    name: str
    source: str
    docs_url: Optional[str]
    service: Optional[str]

@dataclass
class Kind:
    aggregate_root: bool
    fqn: str
    metadata: Metadata
    successor_kinds: Dict[str, List[str]]

    @property
    def name(self) -> str:
        return self.metadata.name or self.fqn

    @property
    def no_provider_name(self) -> str:
        return self.name.split(" ", maxsplit=1)[-1] if self.metadata.source != "base" else self.name

    @property
    def categories(self) -> List[str]:
        return [known_categories.get(cat, cat.capitalize()) for cat in sorted(self.metadata.categories)]

    @property
    def path(self) -> str:
        prefix = "" if self.metadata.source=="base" else (self.metadata.service or "root") + "/"
        return f'{prefix}{self.fqn}.mdx'

    @staticmethod
    def from_json(js: Dict[str, Any]) -> 'Kind':
        metadata = js.get('metadata', {})
        return Kind(
            aggregate_root=js.get('aggregate_root', False),
            fqn=js['fqn'],
            metadata=Metadata(
                categories=metadata.get('categories', ["misc"]),
                group=metadata.get('group', "misc"),
                description=metadata.get('description', ""),
                name=metadata.get('name', js['fqn']),
                source=metadata.get('source', "other"),
                docs_url=metadata.get('docs_url'),
                service=metadata.get('service')
            ),
            successor_kinds=js.get('successor_kinds', {})
        )

    def is_valid(self) -> bool:
        return not(self.metadata.source == "base" and "unknown" in self.fqn)


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

def get_kinds() -> Tuple[Dict[str, Kind], Dict[str, List[Kind]]]:
    kinds_by_source = defaultdict(list)
    all_kinds: Dict[str, Any] = {}
    for kind_js in get_url(f"{core}/graph/fix/model", dict(aggregate_roots_only="true", with_properties="false")).json():
        kind = Kind.from_json(kind_js)
        if kind.is_valid():
            all_kinds[kind.fqn] = kind
            if kind.metadata.source in sources:
                kinds_by_source[kind.metadata.source].append(kind)

    return all_kinds, kinds_by_source

def load_valid_kinds() -> Tuple[Dict[str, Kind], Dict[str, List[Kind]]]:
    for _ in range(30):  # number of retries
        try:
            print("Getting available kinds...")
            all_kinds, kinds_by_source = get_kinds()
            if all_kinds and kinds_by_source:
                return all_kinds, kinds_by_source
            else:
                print(f"Retrying in 5 seconds...")
        except Exception as ex:
            print(f"Error getting list of kinds: {ex}")
        time.sleep(5)
    raise ValueError("Could not load kinds!")

def kind_md(provider: str, kind: Kind, properties: Callable[[str], str],
            relationship: Optional[Callable[[str], str]] = None,
            hierarchy: Optional[Callable[[str], str]] = None,
            ) -> None:
    name = kind.no_provider_name
    category_list = ", ".join(f"{cat}" for cat in kind.categories)
    docs_url = f"- Provider Link: [{kind.no_provider_name}]({kind.metadata.docs_url})" if kind.metadata.docs_url else ""
    service = f"- Service: {kind.metadata.service}" if kind.metadata.service else ""
    hierarchy_text = ""
    if hierarchy is not None:
        hierarchy_text = f"""
## Base Hierarchy
<ZoomPanPinch>

```kroki imgType="plantuml" imgAlt="Hierarchy of {name}"
{hierarchy(kind.fqn)}
```

</ZoomPanPinch>

"""
    relationship_text = ""
    if relationship is not None:
        relationship_text = f"""
## Relationship to other Resources
<ZoomPanPinch>

```kroki imgType="plantuml" imgAlt="Diagram of {name} resource relationships"
{relationship(kind.fqn)}
```

</ZoomPanPinch>

"""
    kind_text = f"""---
sidebar_label: {kind.no_provider_name}
---

# `{kind.fqn}`

- Categories: {category_list}
{service}
{docs_url}

## Description
{kind.metadata.description}

{hierarchy_text}

{relationship_text}

## Properties
<ZoomPanPinch>

```kroki imgType="plantuml" imgAlt="Diagram of {name} data model"
{properties(kind.fqn)}
```

</ZoomPanPinch>
"""
    file = docs_dir / provider /  kind.path
    file.parent.mkdir(parents=True, exist_ok=True)
    with open(file, "w+") as file:
        file.write(kind_text)


def provider_md(
    provider: str,
    kinds: List[Kind],
    properties: Callable[[str], str],
    *,
    relationship: Optional[Callable[[str], str]] = None,
    hierarchy: Optional[Callable[[str], str]] = None,
) -> None:
    pdir = docs_dir / provider
    os.makedirs(pdir, exist_ok=True)
    for item in os.listdir(pdir):
        if item != "index.mdx":
            shutil.rmtree(pdir / item) if os.path.isdir(pdir / item) else os.remove(pdir / item)

    idx = pdir / "index.mdx"
    if os.path.exists(idx):
        # in case the file exists, read the header section until the first h2 (##)
        with open(idx, "r+") as file:
            lines = takewhile(lambda ll: not ll.startswith("## "), file.readlines())
    else:
        # provider file does not exist, create default header
        lines = [
            f"---\nsidebar_label: {provider.capitalize()}\n---\n\n",
            f"# {provider.capitalize()} resources\n\n",
        ]

    with open(idx, "w+") as file:
        for line in lines:
            file.write(line)

        # write the list of resources alphabetically
        file.write(f"## Alphabetical\n\n")
        for kind in sorted(kinds, key=lambda k: k.no_provider_name):
            file.write(f"- [{kind.no_provider_name}]({kind.path})\n")
        file.write("\n")

        # write the list of resources by category
        file.write(f"## By Category\n\n")
        categories = defaultdict(list)
        for kind in kinds:
            for category in kind.categories:
                categories[category].append(kind)
        for category, cat_kinds in sorted(categories.items()):
            file.write(f"### {category}\n\n")
            for kind in sorted(cat_kinds, key=lambda k: k.no_provider_name):
                file.write(f"- [{kind.no_provider_name}]({kind.path})\n")
            file.write("\n")

    for kind in sorted(kinds, key=lambda k: k.fqn):
        kind_md(provider, kind, properties, relationship, hierarchy)



def export() -> None:
    def uml_diagram(params: Dict[str, str]) -> str:
        return get_url(f"{core}/graph/fix/model/uml", params=params).text

    def class_diagram(name: str) -> str:
        return uml_diagram(dict(output="puml", show=name, sort_props="true"))

    def hierarchy_diagram(name: str) -> str:
        return uml_diagram(dict(output="puml", show=name, with_properties="false"))

    def relationship_diagram(name: str) -> str:
        return uml_diagram(dict(
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
        ))

    def base_diagram(name: str) -> str:
        return uml_diagram(dict(
            hide=",".join(f"{a}.*"for a in unsupported_providers),
            output="puml",
            show=name,
            sort_props="true",
            with_base_classes="true",
            with_inheritance="true",
            with_properties=f"({name})|(resource)",
            with_subclasses="true",
        ))

    all_kinds, kinds_by_source = load_valid_kinds()
    for source, items in kinds_by_source.items():
        print("---------------------------")
        print(
            f"Create provider file: {source} with {len(kinds_by_source[source])} service kinds"
        )
        if source == "base":
            provider_md(source, items, base_diagram)
        else:
            provider_md(source, items, class_diagram, relationship=relationship_diagram, hierarchy=hierarchy_diagram)

export()
