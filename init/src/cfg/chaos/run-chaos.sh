#!/bin/sh -e

get_random_ydb_database_container() {
    # Get a list of all containers starting with database-*
    local containers=$(docker ps --format '{{.Names}}' | grep '^database-')

    # Convert the list to a newline-separated string
    local containers=$(echo "$containers" | tr ' ' '\n')

    # Count the number of containers
    local containersCount=$(echo "$containers" | wc -l)

    # Generate a random number between 0 and containersCount - 1
    local randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)

    # Get the container name at the random index
    nodeForChaos=$(echo "$containers" | sed -n "$(($randomIndex + 1))p")
}

sleep 60

get_random_ydb_database_container
sh -c "docker stop ${nodeForChaos} -t 30"
sh -c "docker start ${nodeForChaos}"

sleep 60

get_random_ydb_database_container
sh -c "docker restart ${nodeForChaos} -t 0"

sleep 60

get_random_ydb_database_container
sh -c "docker kill -s SIGKILL ${nodeForChaos}"

sleep 60
