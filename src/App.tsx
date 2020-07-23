import React, { useState, useEffect, useRef } from "react"
import cx from "classnames"
import { Alert } from "react-bootstrap"
import Sudoku from "./lib/sudoku"
import "./Mode.css"
/* eslint import/no-webpack-loader-syntax: off */
import SudokuSolver from "worker-loader!./workers/solve-sudoku-worker"
import SudokuGenerator from "worker-loader!./workers/generate-sudoku-worker"

import "./App.scss"
import "antd/dist/antd.css"
import { Button, Modal, message } from "antd"

type GridDataType = Array<number[]>
const defaultMode = "4"
var sudoku = new Sudoku({ defaultMode })
var NUMBERS = sudoku.numbers
export default function App() {
  const inputRefs = useRef<{ [index: string]: HTMLInputElement | null }>({})
  const [mode, setMode] = useState("4")

  useEffect(() => {
    sudoku = new Sudoku({ mode })
    NUMBERS = sudoku.numbers
  }, [mode])
  const [isSet, setIs] = useState(false)
  const [gridData, setGridData] = useState<GridDataType>(sudoku.grid)
  const [solvedCells, setSolvedCells] = useState<GridDataType>([])
  const [solving, setSolving] = useState<boolean>(false)
  const [generating, setGenerating] = useState<boolean>(true)
  const [showTips, setShowTips] = useState<boolean>(false)
  const [editingCell, setEditingCell] = useState<string | null>()

  useEffect(() => {
    if (solving) {
      const sudokuSolver: Worker = new SudokuSolver()
      sudokuSolver.addEventListener("message", (event: any) => {
        setSolving(false)

        if (event.data.success) {
          setGridData(event.data.gridData)
        } else {
          Modal.error({
            title: "Sudoku",
            content: "Sorry, this sudoku has no solution!"
          })
        }
      })

      setSolvedCells(sudoku.emptyCells())
      sudokuSolver.postMessage({ gridData, mode })
    }
  }, [solving, gridData])

  useEffect(() => {
    if (generating) {
      const sudokuGenerator: Worker = new SudokuGenerator()
      sudokuGenerator.addEventListener("message", (event: any) => {
        sudoku.grid = event.data.gridData
        setGenerating(false)
        setGridData([...sudoku.grid])
      })

      setShowTips(false)
      setSolvedCells([])
      sudokuGenerator.postMessage({ mode })
    }
  }, [generating, gridData])

  useEffect(() => {
    if (editingCell) {
      if (inputRefs.current) {
        const inputRef = inputRefs.current[editingCell]
        inputRef && inputRef.focus()
      }
    }
  }, [editingCell])

  useEffect(() => {
    const listener = (event: any) => {
      if (!event.target.closest(".sudoku-tips")) {
        setEditingCell(null)
      }
    }

    document.addEventListener("click", listener)

    return () => {
      document.removeEventListener("click", listener)
    }
  }, [])

  const setValue = (x: number, y: number, value: string) => {
    const parsedValue = parseInt(value)

    if (value.length && parsedValue > sudoku.blockSize) {
      message.info(`Only 1-9 numbers are allowed to input here!`)
      return false
    }

    try {
      sudoku.set(x, y, parsedValue || 0)
    } catch (err) {
      message.warning(`Conflict! You cannot set ${parsedValue} here!`)
      return false
    }

    setGridData([...sudoku.grid])
  }

  const resetSudoku = () => {
    sudoku.reset()
    setSolvedCells([])
    setGridData([...sudoku.grid])
    setShowTips(false)
  }
  if (isSet) {
    return (
      <div className="app">
        <div className="app-sudoku">
          <div className="sudoku-container">
            <table className="sudoku-table">
              <tbody>
                {gridData.map((row, y) => (
                  <tr
                    key={y}
                    className={cx({
                      "block-boder": (y + 1) % sudoku.mode.height === 0
                    })}
                  >
                    {row.map((value, x) => (
                      <td
                        key={x}
                        className={cx({
                          "block-boder": (x + 1) % sudoku.mode.width === 0,
                          solved: solvedCells.some(
                            arr => arr.join() === [x, y].join()
                          )
                        })}
                        onClick={() => setEditingCell([x, y].join())}
                      >
                        <div className="cell">
                          {showTips &&
                          !value &&
                          editingCell !== [x, y].join() ? (
                            <div className="sudoku-tips">
                              {NUMBERS.map(num => (
                                <span key={num}>
                                  {sudoku.allowedNumbers(x, y).includes(num) &&
                                    num}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={value || ""}
                              onChange={e => setValue(x, y, e.target.value)}
                              readOnly={generating || solving}
                              ref={input =>
                                (inputRefs.current[[x, y].join()] = input)
                              }
                            />
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sudoku-actions">
              <Button.Group>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => setSolving(true)}
                  disabled={generating || solving}
                  loading={solving}
                >
                  {solving ? "Solving" : "Solve Now!"}
                </Button>
                <Button
                  size="large"
                  onClick={() => setGenerating(true)}
                  disabled={generating || solving}
                  loading={generating}
                >
                  Regenerate Sudoku
                </Button>
                <Button size="large" onClick={() => setShowTips(!showTips)}>
                  {showTips ? "Hide Tips" : "Show Tips"}
                </Button>
                <Button
                  size="large"
                  onClick={resetSudoku}
                  disabled={generating || solving}
                >
                  Clear All
                </Button>
              </Button.Group>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    return (
      <div className="Mode">
        <h1>SUDOKU</h1>
        <Alert id="Alert" key="1" variant="primary">
          Select a level to start the game! :)
        </Alert>
        <Button
          id="btn"
          type="primary"
          size="large"
          onClick={e => {
            e.preventDefault()
            setMode("4")
            setIs(true)
            setGenerating(true)
          }}
        >
          Beginner
        </Button>

        <Button
          id="btn"
          type="primary"
          size="large"
          onClick={e => {
            e.preventDefault()
            setMode("6")
            setIs(true)
            setGenerating(true)
          }}
        >
          Easy
        </Button>
        <Button
          id="btn"
          type="primary"
          size="large"
          onClick={e => {
            e.preventDefault()
            setMode("9")
            setIs(true)
            setGenerating(true)
          }}
        >
          Hard
        </Button>
      </div>
    )
  }
}
