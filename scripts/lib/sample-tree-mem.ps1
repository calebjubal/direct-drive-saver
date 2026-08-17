# Continuously samples the peak combined working set (RSS analogue) of a process
# subtree rooted at -RootPid, writing one JSON object per sample to -OutFile.
# Loops until the root process disappears (after having been observed) or the
# parent kills this process. Intended to be launched by mem-sampler.mjs.

param(
  [int]$RootPid,
  [int]$IntervalMs = 100,
  [string]$OutFile
)

$ErrorActionPreference = "SilentlyContinue"
$sawRoot = $false

while ($true) {
  $procs = Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,WorkingSetSize
  $children = @{}
  $wss = @{}
  foreach ($p in $procs) {
    $wss[[int]$p.ProcessId] = [long]$p.WorkingSetSize
    $ppid = [int]$p.ParentProcessId
    if (-not $children.ContainsKey($ppid)) { $children[$ppid] = New-Object System.Collections.Generic.List[int] }
    $children[$ppid].Add([int]$p.ProcessId)
  }

  if ($wss.ContainsKey($RootPid)) {
    $sawRoot = $true
    # BFS over the subtree
    $total = [long]0
    $count = 0
    $stack = New-Object System.Collections.Generic.Stack[int]
    $stack.Push($RootPid)
    $visited = @{}
    while ($stack.Count -gt 0) {
      $cur = $stack.Pop()
      if ($visited.ContainsKey($cur)) { continue }
      $visited[$cur] = $true
      if ($wss.ContainsKey($cur)) { $total += $wss[$cur]; $count++ }
      if ($children.ContainsKey($cur)) { foreach ($c in $children[$cur]) { $stack.Push($c) } }
    }
    $line = '{"t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"rssBytes":' + $total + ',"nprocs":' + $count + '}'
    Add-Content -Path $OutFile -Value $line
  } elseif ($sawRoot) {
    break  # root existed and is now gone
  }

  Start-Sleep -Milliseconds $IntervalMs
}
