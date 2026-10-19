/* Coding round — the problems that actually come up in a .NET
   written test or a live screen share, with the complexity and the
   trap each one is really testing. */
window.QA = (window.QA || []).concat([

{
  id: "cod-reverse-string", topic: "coding", star: true,
  q: "Reverse a string without using built-in methods",
  tags: ["reverse a string", "reverse string c#", "string reversal", "two pointer"],
  simple: "Walk from both ends towards the middle, swapping as you go. The point of the question is whether you remember that a C# string cannot be changed in place.",
  answer: "`string` is immutable, so you cannot assign to `s[i]`. Convert to a `char[]`, swap with two pointers moving inward, and build the string back.\nComplexity: O(n) time, O(n) space for the array.\nThe follow-ups to expect:\n- *Do it without the array* — not possible for a string in C#; that is the honest answer.\n- *What about `Array.Reverse` or `s.Reverse()` (LINQ)?* — in real code I would use those; the test is asking for the manual version.\n- *Unicode* — this swaps UTF-16 code units, so an emoji or a combining character breaks. Mentioning that unprompted is what separates a good answer from a correct one.",
  code: "public static string Reverse(string s)\n{\n    if (string.IsNullOrEmpty(s)) return s;\n    var a = s.ToCharArray();\n    int i = 0, j = a.Length - 1;\n    while (i < j)\n    {\n        (a[i], a[j]) = (a[j], a[i]);   // tuple swap, no temp variable\n        i++; j--;\n    }\n    return new string(a);\n}\n\n// real code would just be:  new string(s.Reverse().ToArray());",
  project: "The two-pointer version is the same shape as walking a string in from both ends, which is what the document reference validation does when it checks a code is symmetric. Day to day I would call the framework method; the reason to know the manual one is that the interviewer is asking whether I understand the array underneath, not whether I can find Reverse.",
  remember: "Strings are immutable — go via char[], two pointers, O(n)."
},

{
  id: "cod-palindrome", topic: "coding",
  q: "Check whether a string is a palindrome",
  tags: ["palindrome", "palindrome check", "two pointer string"],
  simple: "Compare the first character with the last, the second with the second-last, and so on. If they all match, it reads the same both ways.",
  answer: "Two pointers from both ends, comparing as they move inward. O(n) time and **O(1) space** — better than reversing the string and comparing, which allocates a second string.\nAlways ask whether it should ignore case, spaces and punctuation. For a sentence like *A man, a plan, a canal: Panama* you skip non-letters and compare case-insensitively — and asking that question is part of what is being marked.",
  code: "public static bool IsPalindrome(string s)\n{\n    int i = 0, j = s.Length - 1;\n    while (i < j)\n    {\n        while (i < j && !char.IsLetterOrDigit(s[i])) i++;\n        while (i < j && !char.IsLetterOrDigit(s[j])) j--;\n        if (char.ToLowerInvariant(s[i]) != char.ToLowerInvariant(s[j])) return false;\n        i++; j--;\n    }\n    return true;\n}",
  project: "Same two-pointer walk as reversing, and the detail I always say out loud is normalising first — case and punctuation — because that is where real data breaks it. That is a lesson from the bulk upload rather than from a puzzle: vendor codes arrive with spaces, dashes and mixed case, and anything comparing them has to normalise before it compares.",
  remember: "Two pointers inward — O(n) time, O(1) space. Ask about case and punctuation."
},

{
  id: "cod-duplicates", topic: "coding", star: true,
  q: "Find duplicate values in a list",
  tags: ["find duplicates", "duplicate elements", "hashset duplicates", "groupby count"],
  simple: "Keep a set of what you have already seen. Anything you meet twice is a duplicate. The nested-loop version works but is far slower.",
  answer: "Two acceptable answers, and knowing when to use each is the point:\n- **HashSet** — one pass, O(n) time and O(n) space. `Add` returns false when the value is already there, which makes the whole thing one line inside a loop.\n- **LINQ GroupBy** — shorter and more readable: group, keep groups with more than one member. Same complexity.\nThe wrong answer is a nested loop: O(n²), fine for 10 items and disastrous for 10,000.\nIf they ask for duplicates *and their counts*, GroupBy is the natural fit.",
  code: "// one pass with a set\npublic static List<T> Duplicates<T>(IEnumerable<T> items)\n{\n    var seen = new HashSet<T>();\n    var dup  = new HashSet<T>();\n    foreach (var x in items)\n        if (!seen.Add(x)) dup.Add(x);\n    return dup.ToList();\n}\n\n// LINQ, with counts\nvar counts = items.GroupBy(x => x)\n                  .Where(g => g.Count() > 1)\n                  .Select(g => new { Value = g.Key, Count = g.Count() });",
  project: "This is the Excel bulk upload check in real life — each uploaded row tested against the existing item and vendor master. The first version used a nested loop and was the bottleneck on large files; loading the existing codes into a HashSet once turned a several-minute validation into seconds.",
  remember: "HashSet.Add returns false on a repeat. Never nested loops."
},

{
  id: "cod-second-largest", topic: "coding", star: true,
  q: "Find the second largest number in an array",
  tags: ["second largest", "second highest number", "second max", "single pass"],
  simple: "Track the biggest and the second biggest as you walk the array once. Do not sort it — sorting is more work than the question needs.",
  answer: "One pass, two variables: when a value beats `first`, the old `first` becomes `second`. O(n) time, O(1) space.\nSorting and taking index 1 is O(n log n) and also wrong when there are duplicates — for `[5,5,3]` it returns 5.\nAlways clarify: with duplicates, is the second largest of `[5,5,3]` five or three? Usually they want the second *distinct* value, which is the version below.\nEdge cases to handle out loud: fewer than two elements, and all values equal.",
  code: "public static int? SecondLargest(int[] a)\n{\n    long first = long.MinValue, second = long.MinValue;\n    foreach (var x in a)\n    {\n        if (x > first)       { second = first; first = x; }\n        else if (x > second && x < first) { second = x; }   // distinct\n    }\n    return second == long.MinValue ? (int?)null : (int)second;\n}\n\n// LINQ version\nint? v = a.Distinct().OrderByDescending(x => x).Skip(1).Cast<int?>().FirstOrDefault();",
  project: "One pass with two variables, not a sort, and the thing to mention is duplicates — the second largest of 9, 9, 7 is 7 if they mean distinct. That is the same question as second-highest salary in SQL, where DENSE_RANK handles the tie and MAX of a subquery does not. I ask which they mean rather than guessing.",
  remember: "One pass, two variables. Ask whether duplicates count."
},

{
  id: "cod-anagram", topic: "coding",
  q: "Check whether two strings are anagrams",
  tags: ["anagram", "anagram check", "character count", "sort compare"],
  simple: "Two words are anagrams if they use exactly the same letters the same number of times. Count the letters in each and compare the counts.",
  answer: "Two approaches:\n- **Count characters** in a dictionary (or a 26-slot array for plain lowercase): add for the first string, subtract for the second, and every count must end at zero. **O(n)**.\n- **Sort both and compare** — simpler to write, O(n log n).\nFirst check: if the lengths differ they cannot be anagrams, so return immediately.\nClarify whether case and spaces matter — *Listen* and *Silent* are usually meant to pass.",
  code: "public static bool IsAnagram(string a, string b)\n{\n    if (a.Length != b.Length) return false;\n    var count = new Dictionary<char, int>();\n    foreach (var c in a.ToLowerInvariant())\n        count[c] = count.GetValueOrDefault(c) + 1;\n    foreach (var c in b.ToLowerInvariant())\n    {\n        if (!count.TryGetValue(c, out var n) || n == 0) return false;\n        count[c] = n - 1;\n    }\n    return true;\n}",
  project: "A character count in a dictionary, one pass each, rather than sorting both — same idea as the duplicate check the bulk upload runs over a sheet before it writes anything, where counting into a dictionary is cheaper than sorting five thousand rows to find the repeats.",
  remember: "Length check first, then count characters. O(n) beats sorting."
},

{
  id: "cod-first-non-repeat", topic: "coding",
  q: "Find the first non-repeating character in a string",
  tags: ["first non repeating character", "first unique character", "character frequency"],
  simple: "Count how often each character appears, then walk the string again and return the first one with a count of one.",
  answer: "Two passes, O(n) overall: build a frequency map, then scan the original string **in order** and return the first character whose count is 1.\nThe trap is the order. A dictionary does not guarantee insertion order in general, so you must re-scan the original string rather than iterating the dictionary — people lose marks here.\nReturn a sensible sentinel when every character repeats.",
  code: "public static char? FirstUnique(string s)\n{\n    var freq = new Dictionary<char, int>();\n    foreach (var c in s) freq[c] = freq.GetValueOrDefault(c) + 1;\n    foreach (var c in s) if (freq[c] == 1) return c;    // original order\n    return null;\n}",
  project: "Two passes with a count dictionary, and the ordering detail matters: I count first, then walk the original string again, because the dictionary does not preserve the position. That is the same two-pass shape as validating an upload — gather the counts, then report in the order the user will recognise, which is the row order they gave you.",
  remember: "Count first, then re-scan the string in order — not the dictionary."
},

{
  id: "cod-fizzbuzz", topic: "coding",
  q: "FizzBuzz",
  tags: ["fizzbuzz", "fizz buzz", "modulo"],
  simple: "Print 1 to n, but multiples of 3 become Fizz, multiples of 5 become Buzz, and multiples of both become FizzBuzz. It exists to check you can write a loop and an if.",
  answer: "The only mistake is checking 3 and 5 before checking 15 — then 15 prints Fizz and never reaches FizzBuzz. Test the combined case first, or build the string up.\nIt is genuinely used as a filter question, so answer it cleanly and without over-engineering. A readable loop beats a clever one-liner here.",
  code: "for (int i = 1; i <= n; i++)\n{\n    var s = (i % 3 == 0 ? \"Fizz\" : \"\") + (i % 5 == 0 ? \"Buzz\" : \"\");\n    Console.WriteLine(s.Length > 0 ? s : i.ToString());\n}",
  project: "The only thing worth saying here is to check the fifteen case first, because the common wrong answer writes three branches and never reaches it. It is a reading-comprehension test more than an algorithm, and rushing it is the actual trap.",
  remember: "Check the 15 case first, or build the string. Keep it readable."
},

{
  id: "cod-fibonacci", topic: "coding",
  q: "Print the Fibonacci series (and recursion vs iteration)",
  tags: ["fibonacci", "recursion vs iteration", "memoization", "stack overflow recursion"],
  simple: "Each number is the sum of the two before it. You can write it with a loop or with recursion — the loop is the one you should write.",
  answer: "**Iterative** is O(n) time, O(1) space — two variables rolling forward.\n**Naive recursion** is O(2ⁿ): `Fib(40)` recomputes the same values millions of times, and deep recursion risks a `StackOverflowException`, which cannot be caught in .NET.\n**Memoised recursion** caches results and is back to O(n).\nSo the answer that scores is: I write it iteratively; recursion here is exponential unless memoised, and in .NET there is no tail-call optimisation to rely on.\nAlso watch overflow — Fibonacci passes `int.MaxValue` at n = 47, so use `long`.",
  code: "// iterative - the one to write\npublic static IEnumerable<long> Fib(int n)\n{\n    long a = 0, b = 1;\n    for (int i = 0; i < n; i++)\n    {\n        yield return a;\n        (a, b) = (b, a + b);\n    }\n}\n\n// memoised recursion, if they insist on recursion\nstatic Dictionary<int, long> memo = new();\nstatic long FibR(int n) =>\n    n < 2 ? n : memo.TryGetValue(n, out var v) ? v : memo[n] = FibR(n - 1) + FibR(n - 2);",
  project: "I would write the iterative one and then say why: the naive recursion recomputes the same values exponentially, and for anything beyond a small n it is the wrong answer even though it reads more elegantly. If they want recursion I would memoise it. Choosing iteration here is the same instinct as doing work set-based in SQL instead of row by row in a cursor.",
  remember: "Iterative O(n). Naive recursion is O(2^n) and can blow the stack."
},

{
  id: "cod-prime", topic: "coding",
  q: "Check whether a number is prime",
  tags: ["prime number", "prime check", "sqrt loop"],
  simple: "A prime divides by nothing except 1 and itself. You only have to test divisors up to the square root, because any larger factor already has a smaller partner.",
  answer: "Loop to `i * i <= n` rather than to `n` — that turns O(n) into O(√n), and explaining *why* (factors come in pairs around the square root) is the point of the question.\nHandle the edges: numbers below 2 are not prime, 2 is the only even prime, and after that you can step by 2 and skip every even number.\nFor *all primes up to n*, the Sieve of Eratosthenes is the right answer instead.",
  code: "public static bool IsPrime(int n)\n{\n    if (n < 2) return false;\n    if (n % 2 == 0) return n == 2;\n    for (int i = 3; (long)i * i <= n; i += 2)\n        if (n % i == 0) return false;\n    return true;\n}",
  project: "Check to the square root, and skip the even numbers after two. The point to make is that going all the way to n is not wrong, it is just doing twice the work for no reason — which is the same thing I would say about a query scanning a table when the plan could seek.",
  remember: "Loop to √n and skip evens. Factors pair around the square root."
},

{
  id: "cod-reverse-words", topic: "coding",
  q: "Reverse the words in a sentence",
  tags: ["reverse words", "reverse sentence", "split join", "word order"],
  simple: "Reverse the order of the words, not the letters inside them. Split on spaces, reverse the list, join it back.",
  answer: "`Split` with `StringSplitOptions.RemoveEmptyEntries` handles multiple spaces, then `Array.Reverse` and `string.Join`. O(n).\nClarify which they want: *hello world* → *world hello* (word order) or *olleh dlrow* (letters within each word). They are different questions and people answer the wrong one.\nIf they ask for it in place with no extra array, the classic trick is: reverse the whole string, then reverse each word back.",
  code: "public static string ReverseWords(string s)\n{\n    var w = s.Split(' ', StringSplitOptions.RemoveEmptyEntries);\n    Array.Reverse(w);\n    return string.Join(' ', w);\n}",
  project: "Split, reverse the order, join — and the detail that catches people is collapsing the extra whitespace, because real input has double spaces in it. Every string that arrives from the bulk upload gets trimmed and collapsed before anything else touches it, for exactly that reason.",
  remember: "Split, reverse, join. Ask whether they mean word order or letters."
},

{
  id: "cod-missing-number", topic: "coding",
  q: "Find the missing number in an array of 1 to n",
  tags: ["missing number", "sum formula", "xor trick", "find missing element"],
  simple: "Work out what the total should be if nothing were missing, subtract what the total actually is, and the difference is the missing number.",
  answer: "Expected sum of 1..n is `n * (n + 1) / 2`. Subtract the actual sum. O(n) time, O(1) space — one pass, no extra data structure.\nMention the overflow risk: for a large n the sum exceeds `int`, so compute in `long`.\nThe XOR variant avoids overflow entirely — XOR all the numbers 1..n and all the array values; everything present cancels and the missing number survives. Offering that as the overflow-safe alternative lands well.\nIf **two** numbers are missing, the sum alone is not enough — you need the sum of squares as well, or a HashSet.",
  code: "public static int Missing(int[] a, int n)\n{\n    long expected = (long)n * (n + 1) / 2;\n    long actual = 0;\n    foreach (var x in a) actual += x;\n    return (int)(expected - actual);\n}\n\n// overflow-proof alternative\nint miss = 0;\nfor (int i = 1; i <= n; i++) miss ^= i;\nforeach (var x in a) miss ^= x;",
  project: "The sum formula, n times n plus one over two, minus the actual sum. One pass, no extra memory. The follow-up is usually what happens with two missing numbers or with overflow on a large n, and saying the limit yourself before they ask is worth more than the answer.",
  remember: "n(n+1)/2 minus the actual sum. Use long, or XOR to dodge overflow."
},

{
  id: "cod-two-sum", topic: "coding", star: true,
  q: "Find two numbers in an array that add up to a target",
  tags: ["two sum", "pair sum", "dictionary lookup", "complement"],
  simple: "For each number, ask whether you have already seen the number that completes the pair. A dictionary makes that check instant.",
  answer: "The brute force is two nested loops, O(n²). The expected answer is one pass with a dictionary: for each value, look up `target - value`; if it is there you have the pair, otherwise store the current value and move on. **O(n) time, O(n) space** — the classic trade of memory for speed.\nStore the index as the dictionary value if they want positions back.\nIf the array is already sorted, two pointers from both ends gives O(n) with O(1) space, which is the better answer in that case — so ask whether it is sorted.",
  code: "public static (int, int)? TwoSum(int[] a, int target)\n{\n    var seen = new Dictionary<int, int>();        // value -> index\n    for (int i = 0; i < a.Length; i++)\n    {\n        if (seen.TryGetValue(target - a[i], out var j)) return (j, i);\n        seen[a[i]] = i;\n    }\n    return null;\n}",
  project: "A dictionary of value to index in one pass, checking for the complement as you go — the brute force is two nested loops and the dictionary turns it linear. That trade, memory for time, is the same one as a covering index: you pay in space so the lookup stops being a scan.",
  remember: "Look up the complement in a dictionary. O(n) instead of O(n²)."
},

{
  id: "cod-balanced-brackets", topic: "coding",
  q: "Check whether brackets in a string are balanced",
  tags: ["balanced parentheses", "stack problem", "matching brackets", "valid parentheses"],
  simple: "Push every opening bracket onto a stack. On a closing bracket, the top of the stack must be its matching partner. At the end the stack must be empty.",
  answer: "This is the standard question for *do you know when to reach for a Stack*. O(n) time, O(n) space.\nThree failure cases to handle, and naming them is half the marks: a closing bracket with an **empty stack**, a closing bracket that **does not match** the top, and leftovers on the stack at the end.\nA counter works only for one bracket type — the moment there are three types you need the stack.",
  code: "public static bool IsBalanced(string s)\n{\n    var pairs = new Dictionary<char, char> { [')'] = '(', [']'] = '[', ['}'] = '{' };\n    var stack = new Stack<char>();\n    foreach (var c in s)\n    {\n        if (c == '(' || c == '[' || c == '{') stack.Push(c);\n        else if (pairs.TryGetValue(c, out var open))\n        {\n            if (stack.Count == 0 || stack.Pop() != open) return false;\n        }\n    }\n    return stack.Count == 0;\n}",
  project: "A stack: push the openers, and on a closer check the top matches. The case people forget is a string that ends with the stack not empty, which is unbalanced even though nothing ever mismatched. The same check sits behind validating a nested document structure before it is accepted.",
  remember: "Stack. Empty on close, wrong match, or leftovers at the end = unbalanced."
},

{
  id: "cod-sort", topic: "coding",
  q: "Sort an array without using built-in sort",
  tags: ["bubble sort", "sorting algorithm", "selection sort", "quicksort", "sort without builtin"],
  simple: "Bubble sort: walk the array repeatedly, swapping neighbours that are out of order, until a full pass makes no swaps. Easy to write, slow on big data.",
  answer: "**Bubble sort** is O(n²) and the one people write from memory. Add the early-exit flag — if a pass makes no swaps the array is already sorted, which makes the best case O(n).\nKnow roughly where the others sit:\n- **Selection / insertion** — O(n²); insertion is genuinely good on nearly-sorted data.\n- **Merge sort** — O(n log n) always, stable, needs O(n) extra space.\n- **Quicksort** — O(n log n) average, O(n²) worst case on bad pivots, sorts in place.\n.NET's `Array.Sort` uses introsort (quicksort that falls back to heapsort), and `OrderBy` in LINQ is a **stable** sort that returns a new sequence. In real code I use those — this question is testing whether I understand what they do.",
  code: "public static void BubbleSort(int[] a)\n{\n    for (int i = 0; i < a.Length - 1; i++)\n    {\n        bool swapped = false;\n        for (int j = 0; j < a.Length - 1 - i; j++)\n            if (a[j] > a[j + 1]) { (a[j], a[j + 1]) = (a[j + 1], a[j]); swapped = true; }\n        if (!swapped) break;                  // already sorted\n    }\n}",
  project: "I would write the simple one, usually insertion or bubble, say its complexity honestly, and then say I would never ship it — the framework sort is better than anything I would hand-write under interview pressure. What they are testing is whether I can reason about the loop and the swap, not whether I have memorised quicksort.",
  remember: "Bubble O(n²) with an early exit. Merge O(n log n) stable; quicksort in place."
},

{
  id: "cod-binary-search", topic: "coding",
  q: "Implement binary search",
  tags: ["binary search", "search sorted array", "log n search", "divide and conquer"],
  simple: "On a sorted array, look at the middle. If the target is smaller, throw away the right half; if larger, throw away the left. Each step halves what is left.",
  answer: "O(log n) — a million items take about twenty comparisons. It only works on **sorted** data, and saying that condition out loud matters.\nTwo classic bugs:\n- `(low + high) / 2` can overflow on large indexes; use `low + (high - low) / 2`.\n- Getting the loop condition wrong (`<` instead of `<=`) makes it miss the final element or loop forever.\nThis is also the mental model behind a database index seek, which is a good bridge if the interviewer came from the SQL side.",
  code: "public static int BinarySearch(int[] a, int target)\n{\n    int low = 0, high = a.Length - 1;\n    while (low <= high)\n    {\n        int mid = low + (high - low) / 2;      // overflow-safe\n        if (a[mid] == target) return mid;\n        if (a[mid] < target) low = mid + 1;\n        else high = mid - 1;\n    }\n    return -1;\n}",
  project: "The loop with low, high and mid, and the two details that separate a careful answer from a remembered one: the array has to be sorted, and mid should be low plus high minus low over two to avoid overflow. It is the same idea as an index seek — halve the search space instead of walking it.",
  remember: "Sorted only, O(log n), and mid = low + (high-low)/2."
},

{
  id: "cod-linq-group", topic: "coding", star: true,
  q: "Group records and find the highest in each group (LINQ)",
  tags: ["linq groupby", "highest salary per department", "group by max", "linq query", "aggregate linq"],
  simple: "Group the rows by the column you care about, then pick the top one from each group. This is the LINQ question that actually comes up in .NET interviews.",
  answer: "`GroupBy` then project each group. The usual phrasing is *highest paid employee per department* or *latest order per customer*.\nWhat they are checking:\n- Do you know `GroupBy` produces groups keyed by the property, and `g.Key` is that value.\n- Can you aggregate — `Max`, `Sum`, `Count`, `Average` — inside the projection.\n- Do you know `OrderByDescending().First()` inside a group gives the whole row, while `Max()` gives only the value.\nThe performance point worth adding: against a database this should stay `IQueryable` so SQL Server does the grouping. Calling `ToList()` first pulls every row into memory and groups in C#.\nBoth query syntax and method syntax are acceptable — method syntax is what most teams write.",
  code: "// top earner per department - the whole row, not just the figure\nvar top = employees\n    .GroupBy(e => e.DeptId)\n    .Select(g => new {\n        DeptId  = g.Key,\n        Highest = g.OrderByDescending(e => e.Salary).First(),\n        Count   = g.Count(),\n        Average = g.Average(e => e.Salary)\n    });\n\n// equivalent query syntax\nvar q = from e in employees\n        group e by e.DeptId into g\n        select new { DeptId = g.Key, Max = g.Max(e => e.Salary) };",
  project: "This is the shape behind the procurement reports — top vendors by spend, latest status per document. Those run as tuned stored procedures using window functions rather than LINQ, because the data volumes are large, but the logic an interviewer is asking for is the same.",
  remember: "GroupBy, then OrderByDescending().First() for the row or Max() for the value. Keep it IQueryable."
},

{
  id: "cod-linq-common", topic: "coding", star: true,
  q: "Which LINQ methods do you use most?",
  tags: ["linq", "linq methods", "select where firstordefault", "selectmany", "any all", "linq basics"],
  simple: "Where filters, Select transforms, OrderBy sorts, GroupBy groups, and First/Single/Any pull out what you need. Knowing which one throws and which returns null is what gets tested.",
  answer: "The ones I use daily:\n- `Where` filter, `Select` project, `SelectMany` flatten a list of lists.\n- `OrderBy` / `ThenBy`, `Take` / `Skip` for paging.\n- `GroupBy`, and the aggregates `Count`, `Sum`, `Min`, `Max`, `Average`.\n- `Any` / `All` for boolean checks, `Contains`, `Distinct`.\n- `First` / `FirstOrDefault`, `Single` / `SingleOrDefault`.\n**The distinction they probe**: `First` throws if there is nothing, `FirstOrDefault` returns null (or the default). `Single` throws if there is **more than one** — so it is the right choice when a second match means the data is broken, and the wrong choice everywhere else.\n**The performance point**: `Any()` beats `Count() > 0` because it stops at the first match. And against EF Core, keep the chain `IQueryable` so it translates to SQL — one `ToList()` too early and the rest runs in memory.",
  code: "var openPos = db.PurchaseOrders\n    .Where(p => p.VendorId == id && p.Status == \"OPEN\")\n    .OrderByDescending(p => p.CreatedOn)\n    .Select(p => new PoDto { Id = p.Id, Total = p.Total })\n    .Take(50);\n\nbool hasAny = db.PurchaseOrders.Any(p => p.VendorId == id);   // not Count() > 0\nvar lines   = orders.SelectMany(o => o.Lines);                // flatten",
  project: "Every list and report endpoint in the Vendor Portal is a chain like the first one — filter, order, project into a DTO, page — kept as IQueryable so SQL Server does the work and only the page comes back.",
  remember: "First throws, FirstOrDefault returns null, Single throws on two. Any() over Count() > 0."
},

{
  id: "cod-bigo", topic: "coding", star: true,
  q: "What is Big-O and what are the complexities you should know?",
  tags: ["big o", "time complexity", "space complexity", "o(n)", "algorithm complexity", "big o in your own words", "complexity analysis"],
  simple: "Big-O describes how the work grows as the data grows. O(1) does not care how big the data is, O(n) doubles when the data doubles, and O(n²) gets four times worse.",
  answer: "The ones worth knowing cold:\n- **O(1)** — dictionary or HashSet lookup, array index.\n- **O(log n)** — binary search, a balanced tree, a database index seek.\n- **O(n)** — one pass over a list.\n- **O(n log n)** — a good sort; this is the realistic floor for comparison sorting.\n- **O(n²)** — nested loops over the same data. The one to spot and remove.\n- **O(2ⁿ)** — naive recursive Fibonacci; unusable beyond small n.\nBig-O ignores constants and describes growth, not actual speed — for 10 items an O(n²) loop may well be faster than building a dictionary. It matters at scale.\n**Space complexity** counts too: the HashSet solution to a duplicates problem is O(n) time and O(n) space, where the nested loop is O(n²) time and O(1) space. Naming both trade-offs is what a senior answer sounds like.\nThe practical version: when I see a loop inside a loop over the same collection, I look for a dictionary or a set.",
  project: "The real-world version of this on our platform was the Excel upload validator and the SQL side of it — a nested-loop validation replaced by a HashSet, and queries where a missing index meant a scan instead of a seek. Same idea at two different layers: O(n²) replaced by O(n), and O(n) replaced by O(log n).",
  remember: "O(1) lookup · O(log n) index seek · O(n) one pass · O(n log n) sort · O(n²) nested loops."
},

{
  id: "cod-swap-count", topic: "coding",
  q: "Swap two numbers without a temp variable, and count vowels or words",
  tags: ["swap without temp", "count vowels", "count words", "string manipulation basics"],
  simple: "Small warm-up questions. Swapping without a temp is a tuple assignment in modern C#; counting vowels or words is one pass over the string.",
  answer: "**Swap** — in C# 7+, `(a, b) = (b, a)` is the clean answer. The old arithmetic trick (`a = a + b; b = a - b; a = a - b`) overflows, and the XOR trick breaks when both references are the same variable. Say that you would never write either in production.\n**Count vowels** — one pass, check membership in `aeiou` case-insensitively.\n**Count words** — `Split` with `RemoveEmptyEntries` so repeated spaces do not create empty entries; mention that punctuation and tabs may need `char.IsWhiteSpace` instead.\nThese are filters, not real tests. Answer them quickly and cleanly and move on.",
  code: "(a, b) = (b, a);                                   // swap, no temp\n\nint vowels = s.Count(c => \"aeiouAEIOU\".Contains(c));\nint words  = s.Split(new[] { ' ', '\\t', '\\n' },\n                     StringSplitOptions.RemoveEmptyEntries).Length;",
  project: "Swapping with arithmetic or XOR is a party trick and I would say so — tuple deconstruction is the readable way in C#, and readability wins outside an interview. Counting vowels or words is a single pass with a HashSet for the lookup, which is the same habit as checking membership against a set rather than a list in real code.",
  remember: "(a, b) = (b, a). Split with RemoveEmptyEntries for word counts."
}

]);
