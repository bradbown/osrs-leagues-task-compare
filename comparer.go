package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"slices"
)

type UserCompletedLeagueTasks struct {
	LeagueTasks []int `json:"league_tasks"`
}

type Tasks struct {
	Tasks []Task `json:"tasks"`
}

type Task struct {
	TaskId   int    `json:"id"`
	TaskName string `json:"name"`
}

func main() {
	username1 := "ironblodh"
	username2 := "thummor"

	user1CompletedTasksList := getUserCompletedTaskList(username1)
	user2CompletedTasksList := getUserCompletedTaskList(username2)

	var uncompleteTasks1 []int
	for i := 0; i < len(user2CompletedTasksList.LeagueTasks); i++ {
		task := user2CompletedTasksList.LeagueTasks[i]
		if !slices.Contains(user1CompletedTasksList.LeagueTasks, task) {
			uncompleteTasks1 = append(uncompleteTasks1, task)
		}
	}

	var uncompleteTasks2 []int
	for i := 0; i < len(user1CompletedTasksList.LeagueTasks); i++ {
		task := user1CompletedTasksList.LeagueTasks[i]
		if !slices.Contains(user2CompletedTasksList.LeagueTasks, task) {
			uncompleteTasks2 = append(uncompleteTasks2, task)
		}
	}

	tasks := initTasksList()

	tasksMap := make(map[int]string)

	for i := 0; i < len(tasks.Tasks); i++ {
		tasksMap[tasks.Tasks[i].TaskId] = tasks.Tasks[i].TaskName
	}

	printUsersMissingCompletedTasks(username1, uncompleteTasks1, tasksMap)
	printUsersMissingCompletedTasks(username2, uncompleteTasks2, tasksMap)
}

func getUserCompletedTaskList(username string) UserCompletedLeagueTasks {
	url := fmt.Sprintf("https://sync.runescape.wiki/runelite/player/%s/RAGING_ECHOES_LEAGUE", username)
	fmt.Println(url)
	response1, err := http.Get(url)

	if err != nil {
		fmt.Print(err.Error())
		os.Exit(1)
	}

	responseData1, err := io.ReadAll(response1.Body)
	if err != nil {
		log.Fatal(err)
	}

	var responseObject1 UserCompletedLeagueTasks
	json.Unmarshal(responseData1, &responseObject1)

	return responseObject1
}

func printUsersMissingCompletedTasks(username string, uncompleteTasks []int, tasksMap map[int]string) {
	message := fmt.Sprintf("%s's incomplete tasks:", username)
	fmt.Println(message)

	for i := 0; i < len(uncompleteTasks); i++ {
		taskId := uncompleteTasks[i]

		fmt.Println(tasksMap[taskId])
	}

	fmt.Println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
}

func initTasksList() Tasks {
	jsonFile, err := os.Open("tasks.json")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println("Successfully Opened tasks.json")
	defer jsonFile.Close()

	byteValue, _ := io.ReadAll(jsonFile)

	fmt.Println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")

	var tasks Tasks
	json.Unmarshal(byteValue, &tasks)

	return tasks
}
