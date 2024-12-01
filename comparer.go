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

type Response struct {
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
	response1, err := http.Get("https://sync.runescape.wiki/runelite/player/ironblodh/RAGING_ECHOES_LEAGUE")

	if err != nil {
		fmt.Print(err.Error())
		os.Exit(1)
	}

	responseData1, err := io.ReadAll(response1.Body)
	if err != nil {
		log.Fatal(err)
	}

	var responseObject1 Response
	json.Unmarshal(responseData1, &responseObject1)

	response2, err := http.Get("https://sync.runescape.wiki/runelite/player/thummor/RAGING_ECHOES_LEAGUE")
	if err != nil {
		fmt.Print(err.Error())
		os.Exit(1)
	}

	responseData2, err := io.ReadAll(response2.Body)
	if err != nil {
		log.Fatal(err)
	}

	var responseObject2 Response
	json.Unmarshal(responseData2, &responseObject2)

	var uncompleteTasks1 []int
	for i := 0; i < len(responseObject2.LeagueTasks); i++ {
		task := responseObject2.LeagueTasks[i]
		if !slices.Contains(responseObject1.LeagueTasks, task) {
			uncompleteTasks1 = append(uncompleteTasks1, task)
		}
	}

	var uncompleteTasks2 []int
	for i := 0; i < len(responseObject1.LeagueTasks); i++ {
		task := responseObject1.LeagueTasks[i]
		if !slices.Contains(responseObject2.LeagueTasks, task) {
			uncompleteTasks2 = append(uncompleteTasks2, task)
		}
	}

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
	tasksMap := make(map[int]string)

	for i := 0; i < len(tasks.Tasks); i++ {
		tasksMap[tasks.Tasks[i].TaskId] = tasks.Tasks[i].TaskName
	}

	fmt.Println("Ironblodh's incomplete tasks:")
	for i := 0; i < len(uncompleteTasks1); i++ {
		taskId := uncompleteTasks1[i]

		fmt.Println(tasksMap[taskId])
	}

	fmt.Println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")

	fmt.Println("Thummors's incomplete tasks:")
	for i := 0; i < len(uncompleteTasks2); i++ {
		taskId := uncompleteTasks2[i]

		fmt.Println(tasksMap[taskId])
	}
}
