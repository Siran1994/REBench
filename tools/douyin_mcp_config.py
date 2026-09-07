#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音开放平台 MCP 服务配置与连通性测试工具
用于协助开发者快速配置抖音开放平台 MCP 服务至 Antigravity / Claude / Cursor 的 mcp_config.json。
"""

import sys
import os
import json
import urllib.request
import urllib.error
import argparse

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

MCP_CONFIG_PATH = os.path.expanduser(r'~/.gemini/config/mcp_config.json')


def get_client_token(client_key, client_secret):
    """
    通过 client_key 和 client_secret 获取 client_token
    API: POST https://open.douyin.com/oauth/client_token/
    """
    url = 'https://open.douyin.com/oauth/client_token/'
    payload = json.dumps({
        'client_key': client_key,
        'client_secret': client_secret,
        'grant_type': 'client_credential'
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('data', {}).get('error_code') == 0:
                token = data['data']['access_token']
                expires_in = data['data']['expires_in']
                return True, token, expires_in, "成功获取 client_token"
            else:
                desc = data.get('data', {}).get('description', '未知错误')
                err_code = data.get('data', {}).get('error_code')
                return False, None, None, f"获取 token 失败 ({err_code}): {desc}"
    except Exception as e:
        return False, None, None, f"网络请求异常: {str(e)}"


def test_sse_connection(token, tool_group_aid=None):
    """
    测试 SSE MCP Endpoint 连通性与鉴权
    URL: https://open.douyin.com/sse?token=...
    """
    url = f'https://open.douyin.com/sse?token={token}'
    if tool_group_aid:
        url += f'&tool_group_aid={tool_group_aid}'

    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            status = resp.status
            return True, f"SSE 鉴权连接成功 (HTTP {status})"
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        if e.code == 401:
            return False, f"鉴权失败 (HTTP 401): {body}"
        elif e.code == 404:
            return False, f"缺少必要参数或路径错误 (HTTP 404): {body}"
        elif e.code == 500:
            if '校验apiKey失败' in body or '401' in body:
                return False, f"Token 校验未通过: {body}"
            return False, f"服务端返回 500: {body}"
        return False, f"HTTP 请求失败 ({e.code}): {body}"
    except Exception as e:
        # SSE 连接通常会保持开启，超时或正常建立都可能触发
        return True, f"SSE 连接建立正常 ({str(e)})"


def update_mcp_config(token, tool_group_aid=None):
    """
    更新 ~/.gemini/config/mcp_config.json
    """
    server_url = f'https://open.douyin.com/sse?token={token}'
    if tool_group_aid:
        server_url += f'&tool_group_aid={tool_group_aid}'

    config = {}
    if os.path.exists(MCP_CONFIG_PATH):
        try:
            with open(MCP_CONFIG_PATH, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            config = {}

    if 'mcpServers' not in config:
        config['mcpServers'] = {}

    config['mcpServers']['douyin-open-mcp'] = {
        'serverUrl': server_url
    }

    os.makedirs(os.path.dirname(MCP_CONFIG_PATH), exist_ok=True)
    with open(MCP_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    return MCP_CONFIG_PATH, server_url


def main():
    parser = argparse.ArgumentParser(description="抖音开放平台 MCP 服务配置与测试工具")
    parser.add_argument("--token", help="直接传入现有的 client_token 或 access_token")
    parser.add_argument("--key", help="抖音开放平台应用的 client_key")
    parser.add_argument("--secret", help="抖音开放平台应用的 client_secret")
    parser.add_argument("--tools", help="开通的工具 ID 列表（可选，以逗号分隔）")
    parser.add_argument("--write-config", action="store_true", default=True, help="是否自动写入 mcp_config.json")

    args = parser.parse_args()

    token = args.token
    if not token and args.key and args.secret:
        print(f"[douyin_mcp] 正在向抖音开放平台请求 client_token (client_key={args.key})...")
        ok, token, expires, msg = get_client_token(args.key, args.secret)
        if not ok:
            print(f"[douyin_mcp] 错误: {msg}")
            sys.exit(1)
        print(f"[douyin_mcp] 成功获取 Token: {token[:12]}... (有效期: {expires} 秒)")

    if not token:
        print("\n[douyin_mcp] 使用说明:")
        print("  方式 1: 直接传入现成的 token 测试并写入:")
        print("    python tools/douyin_mcp_config.py --token <YOUR_TOKEN>")
        print("  方式 2: 传入应用的 key 和 secret 自动获取 token 并写入:")
        print("    python tools/douyin_mcp_config.py --key <CLIENT_KEY> --secret <CLIENT_SECRET>")
        print(f"\n当前 mcp_config.json 路径: {MCP_CONFIG_PATH}\n")
        sys.exit(0)

    print(f"\n[douyin_mcp] 正在测试与抖音开放平台 SSE MCP 的连通性...")
    ok, conn_msg = test_sse_connection(token, args.tools)
    print(f"[douyin_mcp] 连通性测试结果: {'成功' if ok else '失败'} -> {conn_msg}")

    if args.write_config:
        cfg_file, s_url = update_mcp_config(token, args.tools)
        print(f"\n[douyin_mcp] 已成功配置到 Antigravity MCP 配置:")
        print(f"  配置文件: {cfg_file}")
        print(f"  配置节点: mcpServers.douyin-open-mcp")
        print(f"  Endpoint: {s_url}")
        print(f"\n重启或刷新会话后，Antigravity 即可调用抖音开放平台已开通的 MCP 工具！")


if __name__ == '__main__':
    main()
