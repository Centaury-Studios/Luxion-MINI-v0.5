import os
import sys
from pathlib import Path

BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"

IGNORED_PATHS = {
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".cache",
    "__pycache__",
    "venv"
}

def print_tree(directory: Path, prefix: str = "", is_last: bool = True):
    dir_name = directory.name
    if dir_name in IGNORED_PATHS:
        return
    connector = "└── " if is_last else "├── "
    print(f"{prefix}{connector}{BLUE}{dir_name}{RESET}")
    new_prefix = prefix + ("    " if is_last else "│   ")
    try:
        items = [item for item in sorted(directory.iterdir()) 
                if item.name not in IGNORED_PATHS]
        for index, item in enumerate(items):
            is_last_item = index == len(items) - 1
            if item.is_dir():
                print_tree(item, new_prefix, is_last_item)
            else:
                connector = "└── " if is_last_item else "├── "
                print(f"{new_prefix}{connector}{GREEN}{item.name}{RESET}")
    except PermissionError:
        print(f"{new_prefix}└── Error: Sin permiso para acceder")
    except Exception as e:
        print(f"{new_prefix}└── Error: {str(e)}")

def main():
    start_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    print(f"\n{YELLOW}Árbol de directorios:{RESET}")
    print(f"{YELLOW}=================={RESET}\n")
    print_tree(start_dir)
    print()

if __name__ == "__main__":
    main()
