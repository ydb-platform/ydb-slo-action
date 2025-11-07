#!/bin/sh -e

get_random_container() {
    # Get a list of all containers starting with ydb-database-*
    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-database-')

    # Convert the list to a newline-separated string
    containers=$(echo "$containers" | tr ' ' '\n')

    # Count the number of containers
    containersCount=$(echo "$containers" | wc -l)

    # Generate a random number between 0 and containersCount - 1
    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)

    # Get the container name at the random index
    nodeForChaos=$(echo "$containers" | sed -n "$(($randomIndex + 1))p")
}

sleep 30

get_random_container
sh -c "docker stop ${nodeForChaos} -t 30"
sh -c "docker start ${nodeForChaos}"

sleep 30

get_random_container
sh -c "docker restart ${nodeForChaos} -t 0"

sleep 30

get_random_container
sh -c "docker kill -s SIGKILL ${nodeForChaos}"

sleep 30

rolling_restart() {
    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-database-')

    count=0
    n1=
    n2=
    for name in $containers; do
        if [ "$count" -eq 0 ]; then
            n1="$name"
            count=1
        else
            n2="$name"
            count=2
        fi

        if [ "$count" -eq 2 ]; then
            echo "Restarting in parallel: $n1 and $n2 (soft restart, 10s timeout)"

            sh -c "docker restart -t 20 \"$n1\"" &
            pid1=$!
            sh -c "docker restart -t 20 \"$n2\"" &
            pid2=$!
            wait "$pid1"
            wait "$pid2"

            count=0
            n1=
            n2=
            sleep 10
        fi
    done

    if [ "$count" -eq 1 ] && [ -n "$n1" ]; then
        sh -c "docker restart -t 20 \"$n1\"" &
        pid=$!
        wait "$pid"
    fi
}

rolling_restart
