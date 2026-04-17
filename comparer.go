package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
)

const completionRatesURL = "https://oldschool.runescape.wiki/?title=Module:Demonic_Pacts_League/Tasks/completion.json&action=raw&ctype=application%2Fjson"

type UserCompletedLeagueTasks struct {
	LeagueTasks []int `json:"league_tasks"`
}

type Tasks struct {
	Tasks []Task `json:"tasks"`
}

type Task struct {
	TaskId     int    `json:"id"`
	TaskName   string `json:"name"`
	Difficulty string `json:"difficulty"`
	Area       string `json:"area"`
	Points     int    `json:"points"`
}

func main() {
	username1 := "shurbo"
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
	completionRates := getTaskCompletionRates()

	tasksMap := make(map[int]Task)

	for i := 0; i < len(tasks.Tasks); i++ {
		tasksMap[tasks.Tasks[i].TaskId] = tasks.Tasks[i]
	}

	printUsersMissingCompletedTasks(username1, uncompleteTasks1, tasksMap, completionRates)
	printUsersMissingCompletedTasks(username2, uncompleteTasks2, tasksMap, completionRates)
}

func getUserCompletedTaskList(username string) UserCompletedLeagueTasks {
	requestURL := fmt.Sprintf("https://sync.runescape.wiki/runelite/player/%s/DEMONIC_PACTS_LEAGUE", url.PathEscape(username))
	fmt.Println(requestURL)
	request, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		log.Fatal(err)
	}
	request.Header.Set("User-Agent", "osrs-leagues-task-compare/0.1")

	response1, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Print(err.Error())
		os.Exit(1)
	}
	defer response1.Body.Close()

	responseData1, err := io.ReadAll(response1.Body)
	if err != nil {
		log.Fatal(err)
	}

	if response1.StatusCode < http.StatusOK || response1.StatusCode >= http.StatusMultipleChoices {
		log.Fatalf("request failed for %s: %s\n%s", username, response1.Status, string(responseData1))
	}

	var responseObject1 UserCompletedLeagueTasks
	if err := json.Unmarshal(responseData1, &responseObject1); err != nil {
		log.Fatalf("failed to parse response for %s: %v\n%s", username, err, string(responseData1))
	}

	fmt.Printf("%s completed %d league tasks\n", username, len(responseObject1.LeagueTasks))

	return responseObject1
}

func getTaskCompletionRates() map[int]string {
	request, err := http.NewRequest(http.MethodGet, completionRatesURL, nil)
	if err != nil {
		log.Fatal(err)
	}
	request.Header.Set("User-Agent", "osrs-leagues-task-compare/0.1")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		log.Fatal(err)
	}
	defer response.Body.Close()

	responseData, err := io.ReadAll(response.Body)
	if err != nil {
		log.Fatal(err)
	}

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		log.Fatalf("completion rates request failed: %s\n%s", response.Status, string(responseData))
	}

	var rawCompletionRates map[string]json.RawMessage
	if err := json.Unmarshal(responseData, &rawCompletionRates); err != nil {
		log.Fatalf("failed to parse completion rates: %v\n%s", err, string(responseData))
	}

	completionRates := make(map[int]string, len(rawCompletionRates))
	for rawTaskID, rawRate := range rawCompletionRates {
		taskID, err := strconv.Atoi(rawTaskID)
		if err != nil {
			log.Fatalf("failed to parse completion task id %q: %v", rawTaskID, err)
		}

		completionRate, err := formatCompletionRate(rawRate)
		if err != nil {
			log.Fatalf("failed to parse completion rate for task %d: %v", taskID, err)
		}

		completionRates[taskID] = completionRate
	}

	return completionRates
}

func formatCompletionRate(rawRate json.RawMessage) (string, error) {
	var number float64
	if err := json.Unmarshal(rawRate, &number); err == nil {
		return fmt.Sprintf("%g%%", number), nil
	}

	var text string
	if err := json.Unmarshal(rawRate, &text); err != nil {
		return "", err
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return "N/A", nil
	}
	if strings.HasSuffix(text, "%") {
		return text, nil
	}
	return text + "%", nil
}

func printUsersMissingCompletedTasks(username string, uncompleteTasks []int, tasksMap map[int]Task, completionRates map[int]string) {
	message := fmt.Sprintf("%s's incomplete tasks:", username)
	fmt.Println(message)

	for i := 0; i < len(uncompleteTasks); i++ {
		taskId := uncompleteTasks[i]

		task, ok := tasksMap[taskId]
		if !ok {
			fmt.Printf("Unknown task %d | Difficulty: N/A | Region: N/A | Points: N/A | Completed: N/A\n", taskId)
			continue
		}

		completionRate, ok := completionRates[taskId]
		if !ok {
			completionRate = "N/A"
		}

		fmt.Printf("%s | Difficulty: %s | Region: %s | Points: %d | Completed: %s\n", task.TaskName, task.Difficulty, task.Area, task.Points, completionRate)
	}

	fmt.Println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
}

func initTasksList() Tasks {
	jsonFile, err := os.Open("tasks2.json")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Successfully Opened tasks2.json")
	defer jsonFile.Close()

	byteValue, err := io.ReadAll(jsonFile)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")

	var tasks Tasks
	if err := json.Unmarshal(byteValue, &tasks); err != nil {
		log.Fatal(err)
	}

	return tasks
}
