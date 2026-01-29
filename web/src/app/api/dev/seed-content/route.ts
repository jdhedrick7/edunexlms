import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const isDevelopment = process.env.NODE_ENV === 'development'

// Demo course content structure
const CS101_CONTENT = {
  'course.json': JSON.stringify({
    name: 'Introduction to Computer Science',
    code: 'CS101',
    description: 'An introductory course covering fundamental concepts of computer science.',
    settings: {
      allowLateSubmissions: true,
      defaultDueDays: 7,
      tutor: {
        enabled: true,
        personality: 'encouraging and socratic',
        restrictions: {
          revealQuizAnswers: false,
          solveAssignments: false,
          hintLevel: 'guide'
        },
        customInstructions: 'Help students understand programming concepts step by step. Encourage them to try solutions before giving hints.'
      }
    }
  }, null, 2),
  'modules/01-introduction/module.json': JSON.stringify({
    title: 'Getting Started with Programming',
    order: 1,
    published: true,
    unlockDate: null,
    prerequisites: []
  }, null, 2),
  'modules/01-introduction/content.md': `# Getting Started with Programming

Welcome to Introduction to Computer Science! In this module, you'll learn the fundamentals of programming and computational thinking.

## What is Programming?

Programming is the process of creating a set of instructions that tell a computer how to perform a task. These instructions are written in a **programming language** that both humans and computers can understand.

## Why Learn to Program?

- **Problem Solving**: Programming teaches you to break down complex problems into smaller, manageable pieces
- **Creativity**: You can build anything from websites to games to AI systems
- **Career Opportunities**: Software development is one of the fastest-growing fields
- **Understanding Technology**: Knowing how software works helps you be a more informed technology user

## Your First Program

In most programming courses, the first program you write is "Hello, World!" - a simple program that displays this greeting on the screen.

\`\`\`python
print("Hello, World!")
\`\`\`

This single line of code demonstrates several key concepts:
1. **Functions**: \`print()\` is a built-in function that displays text
2. **Strings**: \`"Hello, World!"\` is a string - text enclosed in quotes
3. **Syntax**: The specific way we write code so the computer understands it

## Key Concepts

### Variables
Variables are containers for storing data values:

\`\`\`python
name = "Alice"
age = 20
is_student = True
\`\`\`

### Data Types
- **Strings**: Text data (\`"Hello"\`)
- **Integers**: Whole numbers (\`42\`)
- **Floats**: Decimal numbers (\`3.14\`)
- **Booleans**: True/False values

## Next Steps

In the next module, we'll dive deeper into control flow - how to make programs that can make decisions and repeat actions.

---

*Remember: Every expert programmer started exactly where you are now. Don't be afraid to make mistakes - that's how we learn!*
`,
  'modules/01-introduction/quiz.json': JSON.stringify({
    type: 'quiz',
    title: 'Module 1 Quiz: Programming Basics',
    timeLimit: 15,
    attempts: 3,
    questions: [
      {
        type: 'multiple_choice',
        question: 'What is the primary purpose of a programming language?',
        options: [
          'To communicate instructions to a computer',
          'To make computers run faster',
          'To store data permanently',
          'To connect to the internet'
        ],
        correctIndex: 0,
        points: 10
      },
      {
        type: 'multiple_choice',
        question: 'Which of the following is a valid Python variable assignment?',
        options: [
          '123name = "Alice"',
          'name = "Alice"',
          'name: "Alice"',
          '"Alice" = name'
        ],
        correctIndex: 1,
        points: 10
      },
      {
        type: 'multiple_choice',
        question: 'What data type is the value 3.14?',
        options: [
          'String',
          'Integer',
          'Float',
          'Boolean'
        ],
        correctIndex: 2,
        points: 10
      },
      {
        type: 'short_answer',
        question: 'Explain in your own words why learning to program is valuable.',
        points: 20
      }
    ]
  }, null, 2),
  'modules/02-control-flow/module.json': JSON.stringify({
    title: 'Control Flow and Logic',
    order: 2,
    published: true,
    unlockDate: null,
    prerequisites: ['01-introduction']
  }, null, 2),
  'modules/02-control-flow/content.md': `# Control Flow and Logic

In this module, you'll learn how to make your programs make decisions and repeat actions.

## Conditional Statements

Conditional statements allow your program to make decisions based on conditions.

### If Statements

\`\`\`python
age = 18

if age >= 18:
    print("You are an adult")
else:
    print("You are a minor")
\`\`\`

### Multiple Conditions

\`\`\`python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"

print(f"Your grade is: {grade}")
\`\`\`

## Loops

Loops allow you to repeat code multiple times.

### For Loops

\`\`\`python
# Print numbers 1-5
for i in range(1, 6):
    print(i)

# Iterate over a list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)
\`\`\`

### While Loops

\`\`\`python
count = 0
while count < 5:
    print(count)
    count += 1
\`\`\`

## Boolean Logic

Boolean operators help combine conditions:

- \`and\`: Both conditions must be true
- \`or\`: At least one condition must be true
- \`not\`: Inverts the condition

\`\`\`python
age = 25
has_license = True

if age >= 18 and has_license:
    print("You can drive")
\`\`\`

## Practice Exercise

Try writing a program that:
1. Asks the user for a number
2. Checks if it's positive, negative, or zero
3. If positive, checks if it's even or odd
`,
  'modules/02-control-flow/assignment.json': JSON.stringify({
    type: 'assignment',
    title: 'FizzBuzz Challenge',
    instructions: `# FizzBuzz Challenge

Write a Python program that prints numbers from 1 to 100, but:
- For multiples of 3, print "Fizz" instead of the number
- For multiples of 5, print "Buzz" instead of the number
- For multiples of both 3 and 5, print "FizzBuzz"

## Requirements

1. Your program should handle all numbers from 1 to 100
2. Use a loop to iterate through the numbers
3. Use conditional statements to check divisibility
4. Include comments explaining your logic

## Example Output

\`\`\`
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
...
\`\`\`

## Submission

Submit your Python code as a .py file or paste the code in the text submission box.

## Hints

- Use the modulo operator (%) to check divisibility
- The order of your conditions matters!
- Start by getting 1-100 to print, then add the conditions one at a time
`,
    points: 100,
    dueDate: null,
    submissionTypes: ['text', 'file'],
    rubric: [
      { criteria: 'Correct output for multiples of 3 (Fizz)', points: 25 },
      { criteria: 'Correct output for multiples of 5 (Buzz)', points: 25 },
      { criteria: 'Correct output for multiples of 15 (FizzBuzz)', points: 25 },
      { criteria: 'Code quality and comments', points: 25 }
    ]
  }, null, 2),
  'modules/03-functions/module.json': JSON.stringify({
    title: 'Functions and Modularity',
    order: 3,
    published: true,
    unlockDate: null,
    prerequisites: ['02-control-flow']
  }, null, 2),
  'modules/03-functions/content.md': `# Functions and Modularity

Functions are reusable blocks of code that perform specific tasks. They help organize code and avoid repetition.

## Defining Functions

\`\`\`python
def greet(name):
    """Greet a person by name."""
    return f"Hello, {name}!"

# Using the function
message = greet("Alice")
print(message)  # Output: Hello, Alice!
\`\`\`

## Function Parameters

Functions can accept multiple parameters:

\`\`\`python
def calculate_area(length, width):
    """Calculate the area of a rectangle."""
    return length * width

area = calculate_area(5, 3)
print(f"Area: {area}")  # Output: Area: 15
\`\`\`

## Default Parameters

\`\`\`python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Bob"))           # Hello, Bob!
print(greet("Bob", "Hi"))     # Hi, Bob!
\`\`\`

## Return Values

Functions can return values to be used elsewhere:

\`\`\`python
def is_even(number):
    """Check if a number is even."""
    return number % 2 == 0

print(is_even(4))   # True
print(is_even(7))   # False
\`\`\`

## Scope

Variables defined inside a function are local to that function:

\`\`\`python
def my_function():
    local_var = "I'm local"
    print(local_var)

my_function()
# print(local_var)  # This would cause an error
\`\`\`

## Best Practices

1. **Single Responsibility**: Each function should do one thing well
2. **Descriptive Names**: Function names should describe what they do
3. **Docstrings**: Include documentation for your functions
4. **Keep Functions Short**: If a function is too long, break it into smaller functions
`
}

const MATH201_CONTENT = {
  'course.json': JSON.stringify({
    name: 'Calculus II',
    code: 'MATH201',
    description: 'Advanced calculus covering integration techniques, sequences, series, and multivariable calculus fundamentals.',
    settings: {
      allowLateSubmissions: false,
      defaultDueDays: 7,
      tutor: {
        enabled: true,
        personality: 'patient and thorough',
        restrictions: {
          revealQuizAnswers: false,
          solveAssignments: false,
          hintLevel: 'guide'
        },
        customInstructions: 'Guide students through mathematical concepts step by step. Use visual explanations when helpful. Encourage students to show their work.'
      }
    }
  }, null, 2),
  'modules/01-integration-review/module.json': JSON.stringify({
    title: 'Integration Review',
    order: 1,
    published: true,
    unlockDate: null,
    prerequisites: []
  }, null, 2),
  'modules/01-integration-review/content.md': `# Integration Review

Before diving into advanced integration techniques, let's review the fundamentals from Calculus I.

## The Definite Integral

The definite integral of f(x) from a to b represents the net signed area under the curve:

$$\\int_a^b f(x) \\, dx$$

## Basic Integration Rules

### Power Rule
$$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$$

### Exponential Functions
$$\\int e^x \\, dx = e^x + C$$
$$\\int a^x \\, dx = \\frac{a^x}{\\ln a} + C$$

### Trigonometric Functions
$$\\int \\sin x \\, dx = -\\cos x + C$$
$$\\int \\cos x \\, dx = \\sin x + C$$
$$\\int \\sec^2 x \\, dx = \\tan x + C$$

## Fundamental Theorem of Calculus

**Part 1**: If F(x) = ∫ₐˣ f(t) dt, then F'(x) = f(x)

**Part 2**: ∫ₐᵇ f(x) dx = F(b) - F(a), where F'(x) = f(x)

## Example Problems

### Example 1
Evaluate: $$\\int_0^2 (3x^2 + 2x) \\, dx$$

**Solution**:
$$= \\left[ x^3 + x^2 \\right]_0^2 = (8 + 4) - (0 + 0) = 12$$

### Example 2
Find the antiderivative: $$\\int (e^x + \\cos x) \\, dx$$

**Solution**:
$$= e^x + \\sin x + C$$
`,
  'modules/01-integration-review/quiz.json': JSON.stringify({
    type: 'quiz',
    title: 'Integration Review Quiz',
    timeLimit: 20,
    attempts: 2,
    questions: [
      {
        type: 'multiple_choice',
        question: 'What is ∫ x³ dx?',
        options: [
          'x⁴ + C',
          'x⁴/4 + C',
          '3x² + C',
          'x⁴/3 + C'
        ],
        correctIndex: 1,
        points: 10
      },
      {
        type: 'multiple_choice',
        question: 'What is ∫ cos(x) dx?',
        options: [
          '-sin(x) + C',
          'sin(x) + C',
          '-cos(x) + C',
          'tan(x) + C'
        ],
        correctIndex: 1,
        points: 10
      },
      {
        type: 'multiple_choice',
        question: 'Evaluate ∫₀¹ 2x dx',
        options: [
          '0',
          '1',
          '2',
          '4'
        ],
        correctIndex: 1,
        points: 10
      },
      {
        type: 'short_answer',
        question: 'State the Fundamental Theorem of Calculus (Part 2) and explain its significance.',
        points: 20
      }
    ]
  }, null, 2),
  'modules/02-integration-techniques/module.json': JSON.stringify({
    title: 'Integration Techniques',
    order: 2,
    published: true,
    unlockDate: null,
    prerequisites: ['01-integration-review']
  }, null, 2),
  'modules/02-integration-techniques/content.md': `# Integration Techniques

In this module, we'll learn advanced techniques for evaluating integrals that can't be solved with basic rules.

## Integration by Substitution (u-substitution)

When you see a composite function, try substitution.

### The Method
1. Choose u = g(x) (usually the "inner" function)
2. Find du = g'(x) dx
3. Rewrite the integral in terms of u
4. Integrate
5. Substitute back

### Example
$$\\int 2x \\cos(x^2) \\, dx$$

Let u = x², then du = 2x dx

$$= \\int \\cos(u) \\, du = \\sin(u) + C = \\sin(x^2) + C$$

## Integration by Parts

For products of functions, use: $$\\int u \\, dv = uv - \\int v \\, du$$

**LIATE Rule** for choosing u:
- **L**ogarithmic
- **I**nverse trig
- **A**lgebraic (polynomials)
- **T**rigonometric
- **E**xponential

### Example
$$\\int x e^x \\, dx$$

Let u = x, dv = eˣ dx
Then du = dx, v = eˣ

$$= xe^x - \\int e^x \\, dx = xe^x - e^x + C = e^x(x-1) + C$$

## Trigonometric Integrals

### Powers of Sine and Cosine
- If one power is odd, save one factor and convert the rest using sin²x + cos²x = 1

### Example
$$\\int \\sin^3 x \\, dx = \\int \\sin^2 x \\cdot \\sin x \\, dx = \\int (1 - \\cos^2 x) \\sin x \\, dx$$

Let u = cos x, du = -sin x dx

$$= -\\int (1 - u^2) \\, du = -u + \\frac{u^3}{3} + C = -\\cos x + \\frac{\\cos^3 x}{3} + C$$
`,
  'modules/02-integration-techniques/assignment.json': JSON.stringify({
    type: 'assignment',
    title: 'Integration Techniques Problem Set',
    instructions: `# Integration Techniques Problem Set

Evaluate each integral using the appropriate technique. Show all work clearly.

## Part A: U-Substitution (40 points)

1. ∫ x·sin(x²) dx
2. ∫ e^(3x) dx
3. ∫ (2x+1)/(x²+x+5) dx
4. ∫ tan(x) dx

## Part B: Integration by Parts (40 points)

5. ∫ x·cos(x) dx
6. ∫ x²·eˣ dx
7. ∫ ln(x) dx
8. ∫ x·arctan(x) dx

## Part C: Trigonometric Integrals (20 points)

9. ∫ sin²(x)·cos³(x) dx
10. ∫ tan²(x)·sec²(x) dx

## Submission Requirements

- Show all steps clearly
- State the technique used for each problem
- Box or highlight your final answers
- You may submit handwritten work (scanned/photographed) or typed solutions
`,
    points: 100,
    dueDate: null,
    submissionTypes: ['text', 'file'],
    rubric: [
      { criteria: 'Part A: U-Substitution problems (4 problems)', points: 40 },
      { criteria: 'Part B: Integration by Parts (4 problems)', points: 40 },
      { criteria: 'Part C: Trigonometric Integrals (2 problems)', points: 20 }
    ]
  }, null, 2)
}

export async function POST() {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const supabase = createAdminClient()
    const bucketId = 'inst-a0000000-0000-0000-0000-000000000001'

    // Upload CS101 content
    const cs101VersionPath = 'courses/b0000000-0000-0000-0000-000000000001/material/c0000000-0000-0000-0000-000000000001'

    for (const [filePath, content] of Object.entries(CS101_CONTENT)) {
      const fullPath = `${cs101VersionPath}/${filePath}`
      const { error } = await supabase.storage
        .from(bucketId)
        .upload(fullPath, content, {
          contentType: filePath.endsWith('.json') ? 'application/json' : 'text/markdown',
          upsert: true
        })

      if (error && !error.message.includes('already exists')) {
        console.error(`Error uploading ${fullPath}:`, error)
      }
    }

    // Upload MATH201 content
    const math201VersionPath = 'courses/b0000000-0000-0000-0000-000000000002/material/c0000000-0000-0000-0000-000000000002'

    for (const [filePath, content] of Object.entries(MATH201_CONTENT)) {
      const fullPath = `${math201VersionPath}/${filePath}`
      const { error } = await supabase.storage
        .from(bucketId)
        .upload(fullPath, content, {
          contentType: filePath.endsWith('.json') ? 'application/json' : 'text/markdown',
          upsert: true
        })

      if (error && !error.message.includes('already exists')) {
        console.error(`Error uploading ${fullPath}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Course content seeded successfully',
      data: {
        cs101: {
          versionPath: cs101VersionPath,
          files: Object.keys(CS101_CONTENT)
        },
        math201: {
          versionPath: math201VersionPath,
          files: Object.keys(MATH201_CONTENT)
        }
      }
    })
  } catch (error) {
    console.error('Seed content error:', error)
    return NextResponse.json(
      { error: 'Failed to seed course content' },
      { status: 500 }
    )
  }
}
